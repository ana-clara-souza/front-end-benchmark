// lib/normalize.js
// Equivalente a build_dataframe() (etl.py) e build_prediction_dataframe()
// (etl_prediction.py). O backend agora só valida (Pydantic) e devolve os
// registros crus; esta normalização (labels + coerção numérica + descarte
// de linhas inválidas) passa a rodar no front, sobre o JSON já validado.

import { DATASET_LABELS, MODEL_LABELS, normalizeLabel } from "./labels.js";

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * RD-01 (documento de requisitos, Seção 4 e 9.6): nem o schema Pydantic
 * atual nem a primeira versão deste motor validavam `experimento_id` como
 * string não-vazia — um valor "" passaria despercebido e formaria um grupo
 * fantasma em todos os agrupamentos por experimento_id. Como essa validação
 * não existe hoje no backend, o motor JS assume essa responsabilidade aqui.
 */
function hasValidExperimentoId(r) {
  return typeof r.experimento_id === "string" && r.experimento_id.trim().length > 0;
}

/**
 * Normaliza os registros de execução mobile (POST /analytics -> data[]).
 * Equivalente a build_dataframe(): mapeia dataset/modelo para os labels
 * "bonitos", garante inference_time/pss_peak numéricos, e descarta
 * registros com campos obrigatórios ausentes/nulos.
 *
 * @param {object[]} records - ExperimentRecord[] já validado pelo backend
 * @returns {object[]} registros normalizados, prontos para stats/charts
 */
export function normalizeMobileRecords(records) {
  return records
    .map((r) => ({
      ...r,
      dataset: normalizeLabel(r.dataset, DATASET_LABELS),
      modelo: normalizeLabel(r.modelo, MODEL_LABELS),
      inference_time: toNumberOrNull(r.inference_time),
      pss_peak: toNumberOrNull(r.pss_peak),
    }))
    .filter(
      (r) =>
        hasValidExperimentoId(r) &&
        r.inference_time !== null &&
        r.pss_peak !== null &&
        r.modelo != null &&
        r.dataset != null &&
        r.device != null
    );
}

/**
 * Normaliza os registros de predição (POST /analytics/prediction -> data[]).
 * Equivalente a build_prediction_dataframe().
 */
export function normalizePredictionRecords(records) {
  return records
    .map((r) => ({
      ...r,
      dataset: normalizeLabel(r.dataset, DATASET_LABELS),
      modelo: normalizeLabel(r.modelo, MODEL_LABELS),
      y_true_idx: toNumberOrNull(r.y_true_idx),
      y_pred_idx: toNumberOrNull(r.y_pred_idx),
    }))
    .filter(
      (r) =>
        r.y_true_idx !== null &&
        r.y_pred_idx !== null &&
        r.modelo != null &&
        r.dataset != null &&
        hasValidExperimentoId(r)
    )
    .map((r) => ({
      ...r,
      y_true_idx: Math.trunc(r.y_true_idx),
      y_pred_idx: Math.trunc(r.y_pred_idx),
    }));
}

/**
 * Normaliza mobile_data usado no cálculo de tempo de inferência do Pareto
 * (equivalente à parte de normalização dentro de compute_inference_times).
 */
export function normalizeMobileForPrediction(records) {
  if (!records || records.length === 0) return null;
  return records
    .map((r) => ({
      ...r,
      dataset: normalizeLabel(r.dataset, DATASET_LABELS),
      modelo: normalizeLabel(r.modelo, MODEL_LABELS),
      inference_time: toNumberOrNull(r.inference_time),
    }))
    .filter((r) => r.inference_time !== null && hasValidExperimentoId(r));
}
