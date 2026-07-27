// lib/ingest/messageType.js
//
// Sem rota HTTP (POST /analytics vs POST /analytics/prediction), o front
// precisa decidir sozinho se uma mensagem de WebSocket é execução mobile
// ou avaliação de predição. Isso é seguro de fazer porque os dois schemas
// não têm sobreposição nos campos que importam:
//   - PredictionRecord sempre tem y_true_idx/y_pred_idx (mobile nunca tem)
//   - ExperimentRecord sempre tem device+rep+pss_peak juntos (predição nunca tem)
// O campo `charts` é um segundo sinal independente, porque os dois
// conjuntos de valores aceitos são disjuntos.

export const MOBILE_CHARTS = new Set(["chart1", "chart2", "chart3", "chart4"]);
export const PREDICTION_CHARTS = new Set([
  "chart_metrics", "chart_pareto", "chart_pareto_by_dataset", "chart_f1_heatmap",
]);

/**
 * @returns {"mobile"|"prediction"|"unknown"}
 */
export function detectMessageType(payload) {
  if (!payload || typeof payload !== "object") return "unknown";

  // Sinal 1 (mais barato): campo `charts`.
  if (Array.isArray(payload.charts) && payload.charts.length > 0) {
    const hasMobileChart = payload.charts.some((c) => MOBILE_CHARTS.has(c));
    const hasPredictionChart = payload.charts.some((c) => PREDICTION_CHARTS.has(c));
    if (hasMobileChart && !hasPredictionChart) return "mobile";
    if (hasPredictionChart && !hasMobileChart) return "prediction";
    // Se `charts` misturar os dois conjuntos (payload malformado) ou vier
    // vazio/ambíguo, cai para o sinal 2 abaixo em vez de decidir errado.
  }

  // Sinal 2: forma da primeira linha de `data`.
  const first = Array.isArray(payload.data) ? payload.data[0] : null;
  if (first && typeof first === "object") {
    const looksLikePrediction = "y_true_idx" in first || "y_pred_idx" in first;
    const looksLikeMobile = "device" in first && "rep" in first && "pss_peak" in first;
    if (looksLikePrediction && !looksLikeMobile) return "prediction";
    if (looksLikeMobile && !looksLikePrediction) return "mobile";
  }

  return "unknown";
}
