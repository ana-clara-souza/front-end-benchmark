// lib/dashboardData/normalizeNodeResponse.ts
//
// CONTRATO CONFIRMADO (não é mais suposição): o Node responde SEMPRE com
// uma mensagem única no formato `{ charts, data, mobile_data? }` — o mesmo
// formato pras duas rotas, sem nenhum wrapper por domínio:
//
//   Mobile (chart1-4):
//     { "charts": ["chart1","chart2","chart3","chart4"],
//       "data": [ /* execuções mobile: device, rep, pss_peak, ... */ ] }
//
//   Predição, incluindo Pareto (chart_metrics/chart_pareto/
//   chart_pareto_by_dataset/chart_f1_heatmap):
//     { "charts": ["chart_metrics","chart_pareto", ...],
//       "data": [ /* registros de predição: y_true_idx/y_pred_idx, ... */ ],
//       "mobile_data": [ /* execuções mobile correspondentes, só pro Pareto */ ] }
//
// Ou seja: é exatamente o `AnalyticsMessage`/`RawAnalyticsMessage` que a
// engine já entende nativamente (ver lib/ingest/schema.js —
// AnalyticsMessageSchema / PredictionMessageSchema) — não existe (e não
// existiu) um wrapper `.mobile`/`.prediction`/`.script`. Esta função só
// existe pra cobrir o caso de o front pedir os dois domínios na mesma
// leva de filtros (mobile + predição juntos): nesse cenário o Node pode
// devolver uma lista com as duas mensagens — `detectMessageType()`
// (na engine) já resolve sozinho qual é qual, olhando a forma de cada uma.

export interface RawAnalyticsMessage {
  charts?: string[];
  data: Record<string, unknown>[];
  mobile_data?: Record<string, unknown>[];
}

function looksLikeMessage(value: unknown): value is RawAnalyticsMessage {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>).data)
  );
}

/**
 * @param json - corpo já parseado da resposta do Node (POST com {charts, filters})
 * @returns lista de mensagens (0, 1 ou mais) prontas para `deliverPayload`/`reduceIncomingMessage`
 */
export function normalizeNodeResponseIntoMessages(json: unknown): RawAnalyticsMessage[] {
  // Node manda os dois domínios pedidos juntos (mobile + predição) numa lista.
  if (Array.isArray(json)) {
    return json.filter(looksLikeMessage);
  }

  // Caso comum: uma mensagem só no nível raiz (formato confirmado acima).
  if (looksLikeMessage(json)) return [json];

  return [];
}
