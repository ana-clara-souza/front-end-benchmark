// lib/dashboardData/AnalyticsPayloadContext.tsx
//
// Mecanismo de handoff entre a página de filtro (fora de escopo desta
// integração — ver prompt) e o dashboard. Este Context NÃO faz fetch, não
// abre WebSocket, não sabe nada sobre Node/Mongo — só guarda o payload que
// a página de filtro entrega via `deliverPayload(...)` depois de concluir
// a própria chamada REST dela, e deixa o dashboard reagir a isso.
//
// Formato de `AnalyticsMessage` = exatamente o body que o Node devolve
// (`{ charts, data, mobile_data? }`), o mesmo aceito por
// `validateMessage`/`reduceIncomingMessage` em
// lib/analytics-engine/lib/ingest/{schema,store}.js. Nenhuma transformação
// acontece aqui — é passado adiante como está.

"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface AnalyticsMessage {
  charts?: string[];
  data: Record<string, unknown>[];
  mobile_data?: Record<string, unknown>[];
}

type DeliveryStatus = "idle" | "received" | "error";

interface AnalyticsPayloadContextValue {
  /** Mensagens entregues na última chamada de deliverPayload (uma ou duas: mobile e/ou predição). */
  messages: AnalyticsMessage[];
  /** Identifica cada entrega (muda a cada deliverPayload) — usado pelo hook consumidor pra saber quando reprocessar. */
  deliveryId: number;
  status: DeliveryStatus;
  error: string | null;
  /**
   * Chamado pela página de filtro assim que ela recebe a resposta do Node.
   * Aceita uma mensagem só (ex: só mobile) ou várias (mobile + predição).
   */
  deliverPayload: (messages: AnalyticsMessage | AnalyticsMessage[]) => void;
  /** Reporta um erro na ETAPA DE ENTREGA em si (ex: a própria chamada da página de filtro ao Node falhou) — diferente de um erro de validação Zod, que o reducer já resolve por mensagem. */
  reportDeliveryError: (message: string) => void;
}

const AnalyticsPayloadContext = createContext<AnalyticsPayloadContextValue | null>(null);

export function AnalyticsPayloadProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AnalyticsMessage[]>([]);
  const [status, setStatus] = useState<DeliveryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const deliveryCounter = useRef(0);
  const [deliveryId, setDeliveryId] = useState(0);

  const deliverPayload = useCallback((incoming: AnalyticsMessage | AnalyticsMessage[]) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    deliveryCounter.current += 1;
    setMessages(list);
    setStatus("received");
    setError(null);
    setDeliveryId(deliveryCounter.current);
  }, []);

  const reportDeliveryError = useCallback((message: string) => {
    setStatus("error");
    setError(message);
  }, []);

  const value = useMemo(
    () => ({ messages, deliveryId, status, error, deliverPayload, reportDeliveryError }),
    [messages, deliveryId, status, error, deliverPayload, reportDeliveryError]
  );

  return <AnalyticsPayloadContext.Provider value={value}>{children}</AnalyticsPayloadContext.Provider>;
}

/** Acesso cru ao contexto — usado por useAnalyticsFeedFromFilter.ts (dashboard) e, futuramente, pela página de filtro para chamar deliverPayload. */
export function useAnalyticsPayloadContext(): AnalyticsPayloadContextValue {
  const ctx = useContext(AnalyticsPayloadContext);
  if (!ctx) {
    throw new Error(
      "useAnalyticsPayloadContext precisa estar dentro de <AnalyticsPayloadProvider> (ver app/layout.tsx)."
    );
  }
  return ctx;
}
