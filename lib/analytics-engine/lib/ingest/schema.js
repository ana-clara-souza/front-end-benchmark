// lib/ingest/schema.js
//
// Espelha schemas.py (ExperimentRecord) e schemas_prediction.py
// (PredictionRecord, MobileExecutionRecord) usando Zod. Esta é a barreira
// de validação que a API Python fazia via Pydantic (422 em campo
// obrigatório ausente/tipo errado) — como o Node agora fala direto com o
// front por WebSocket, não existe mais um status HTTP pra se apoiar, então
// essa validação vira a fonte de verdade do lado do cliente.
//
// RD-01 (já implementado como filtro defensivo em normalize.js) também é
// aplicado aqui, na entrada, como validação "dura": `experimento_id` vazio
// já rejeita a mensagem inteira em vez de silenciosamente descartar a
// linha mais adiante — falha cedo e visível, como um 422 faria.

import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

// ---------------------------------------------------------------------------
// ExperimentRecord (execução mobile) — POST /analytics original
// ---------------------------------------------------------------------------

export const ExperimentRecordSchema = z.object({
  experimento_id: nonEmptyString,
  modelo: nonEmptyString,
  dataset: nonEmptyString,
  fold: z.number().int(),
  device: nonEmptyString,
  rep: z.number().int(),
  inference_time: z.number(),
  pss_peak: z.number(),
  pss_baseline: z.number().nullish(),
  pss_after_load: z.number().nullish(),
  pss_warmup: z.number().nullish(),
  pss_footprint: z.number().nullish(),
  brightness_pct: z.number().nullish(),
  battery_pct: z.number().nullish(),
  is_charging: z.string().nullish(),
  airplane_mode: z.string().nullish(),
});

export const MobileChartName = z.enum(["chart1", "chart2", "chart3", "chart4"]);

export const AnalyticsMessageSchema = z.object({
  charts: z.array(MobileChartName).optional(),
  data: z.array(ExperimentRecordSchema).min(1),
});

// ---------------------------------------------------------------------------
// PredictionRecord + MobileExecutionRecord — POST /analytics/prediction original
// ---------------------------------------------------------------------------

export const PredictionRecordSchema = z.object({
  experimento_id: nonEmptyString,
  modelo: nonEmptyString,
  dataset: nonEmptyString,
  fold: z.number().int(),
  y_true_idx: z.number().int(),
  y_pred_idx: z.number().int(),
  correct: z.number().int().nullish(),
  pred_confidence: z.number().nullish(),
  prob_class_0: z.number().nullish(),
  prob_class_1: z.number().nullish(),
  prob_class_2: z.number().nullish(),
  prob_class_3: z.number().nullish(),
  prob_class_4: z.number().nullish(),
  prob_class_5: z.number().nullish(),
  prob_class_6: z.number().nullish(),
  prob_class_7: z.number().nullish(),
  prob_class_8: z.number().nullish(),
  filename: z.string().nullish(),
});

export const MobileExecutionRecordSchema = z.object({
  experimento_id: nonEmptyString,
  modelo: nonEmptyString,
  dataset: nonEmptyString,
  device: nonEmptyString,
  inference_time: z.number(),
  fold: z.number().int().nullish(),
  rep: z.number().int().nullish(),
  pss_peak: z.number().nullish(),
});

export const PredictionChartName = z.enum([
  "chart_metrics", "chart_pareto", "chart_pareto_by_dataset", "chart_f1_heatmap",
]);

export const PredictionMessageSchema = z.object({
  charts: z.array(PredictionChartName).optional(),
  data: z.array(PredictionRecordSchema).min(1),
  mobile_data: z.array(MobileExecutionRecordSchema).optional(),
});

/**
 * Valida uma mensagem crua contra o schema certo, dado o `type` já
 * detectado por detectMessageType(). Retorna um resultado no estilo
 * Result (nunca lança), pra quem chama decidir o que fazer com o erro
 * (equivalente ao 422 que a API Python devolvia).
 *
 * @returns {{ok: true, data: object} | {ok: false, errors: string[]}}
 */
export function validateMessage(type, payload) {
  const schema = type === "mobile" ? AnalyticsMessageSchema
    : type === "prediction" ? PredictionMessageSchema
    : null;

  if (!schema) {
    return { ok: false, errors: [`Tipo de mensagem desconhecido (não foi possível distinguir mobile de predição): ${JSON.stringify(payload).slice(0, 200)}`] };
  }

  const result = schema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  return { ok: false, errors };
}
