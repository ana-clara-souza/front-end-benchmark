// lib/dashboardData/useAnalyticsFeedFromFilter.ts
//
// Substituto PASSIVO de lib/analytics-engine/lib/ingest/useAnalyticsFeed.js
// (que é baseado em WebSocket — connection.js). Aqui não há transporte
// nenhum: o payload já chega pronto via AnalyticsPayloadContext (entregue
// pela página de filtro, fora de escopo desta integração). Este hook só
// alimenta cada mensagem recebida para dentro de `reduceIncomingMessage`
// (reducer puro de lib/ingest/store.js) — a MESMA validação (Zod) e o
// MESMO cálculo estatístico que useAnalyticsFeed usaria, sem duplicar
// nenhuma lógica.
//
// Expõe o mesmo shape que useAnalyticsFeed expõe hoje
// ({ mobile, prediction, lastError, lastUpdatedAt }), trocando
// `connectionStatus` (que não faz sentido sem conexão) por `deliveryStatus`:
// "waiting"  -> nenhum payload chegou ainda da etapa de filtro
// "received" -> último payload processado com sucesso (mesmo que alguma
//               mensagem individual dentro dele tenha falhado validação —
//               ver `lastError`, que reflete isso por mensagem)
// "error"    -> a PRÓPRIA ENTREGA falhou (ex: a chamada da página de
//               filtro ao Node deu erro antes de conseguir entregar nada
//               ao dashboard) — diferente de erro de validação Zod.

"use client";

import { useMemo } from "react";
import { useAnalyticsPayloadContext } from "./AnalyticsPayloadContext";

// Fronteira JS (engine, sem tipos declarados) <-> TS (front, strict mode):
// cast explícito e deliberado, não uma lacuna de segurança de tipos — a
// engine já tem sua própria suíte de testes (lib/analytics-engine/__tests__)
// validando esses contratos no nível JS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as StoreModule from "../analytics-engine/lib/ingest/store.js";
const { createInitialState, reduceIncomingMessage } = StoreModule as unknown as {
  createInitialState: () => AnalyticsFeedState;
  reduceIncomingMessage: (prev: AnalyticsFeedState, raw: unknown) => AnalyticsFeedState;
};

export interface AnalyticsFeedState {
  mobile: { requested: string[]; results: Record<string, unknown>; recordCount: number } | null;
  prediction: { requested: string[]; results: Record<string, unknown>; recordCount: number } | null;
  lastMessageType: "mobile" | "prediction" | "unknown" | null;
  lastError: string[] | null;
  lastUpdatedAt: number | null;
}

export type DeliveryStatus = "waiting" | "received" | "error";

export function useAnalyticsFeedFromFilter() {
  const { messages, deliveryId, status: contextStatus, error: deliveryError } = useAnalyticsPayloadContext();

  // CADA ENTREGA É UMA DASHBOARD NOVA E COMPLETA — não um incremento sobre
  // a anterior. Cada resposta do backend já contém tudo que a página
  // precisa (ver contrato em CONTRATO_BACKEND_NODE.md); uma nova entrega
  // não é "mais dados chegando aos poucos", é o usuário aplicando um novo
  // filtro e recebendo uma dashboard inteiramente diferente. Por isso a
  // base do reduce é SEMPRE createInitialState() (nunca o `state` da
  // entrega anterior) — se a nova entrega só tem mensagem mobile, a
  // predição da entrega anterior precisa sumir junto, não ficar "presa"
  // na tela mostrando dado de um filtro que não é mais o aplicado.
  //
  // As MENSAGENS DENTRO DE UMA MESMA ENTREGA continuam sendo processadas
  // em sequência sobre o mesmo estado (mobile e predição coexistindo
  // quando os dois vêm juntos numa resposta só) — isso não muda, e
  // continua coberto por lib/analytics-engine/__tests__/ingest.test.js
  // ("mobile e predição são slots independentes: mensagens intercaladas
  // não se apagam" — esse teste é sobre DUAS MENSAGENS DA MESMA entrega,
  // não sobre persistência entre entregas separadas).
  //
  // Sendo uma derivação pura de `messages`/`deliveryId` (sem depender do
  // estado de um render anterior), useMemo é a ferramenta certa aqui —
  // sem useEffect, sem o render em cascata que o lint
  // react-hooks/set-state-in-effect aponta.
  const state = useMemo<AnalyticsFeedState>(() => {
    if (deliveryId === 0 || messages.length === 0) return createInitialState();
    return messages.reduce((acc, msg) => reduceIncomingMessage(acc, msg), createInitialState());
  }, [deliveryId]); // eslint-disable-line react-hooks/exhaustive-deps -- `messages` muda sempre junto com `deliveryId` (ver AnalyticsPayloadContext.deliverPayload)

  const deliveryStatus: DeliveryStatus =
    contextStatus === "error" ? "error" : deliveryId === 0 ? "waiting" : "received";

  return { ...state, deliveryStatus, deliveryError };
}
