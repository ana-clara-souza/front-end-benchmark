// lib/types.ts
//
// Espelha 1:1 os schemas Pydantic atuais (schemas.py / schemas_prediction.py).
// Este arquivo é só de tipos (contratos de entrada) — a validação de fato
// (RD-01 incluída) continua em normalize.js, que é quem decide o que
// descartar/aceitar. Ver Seção 3.2 do documento de requisitos: validação de
// payload continua fora de escopo aqui (é responsabilidade do backend ou de
// uma camada own no frontend usando estes tipos).

/** Espelha ExperimentRecord (schemas.py). */
export interface ExperimentRecord {
  experimento_id: string; // RD-01: deveria ser validado como não-vazio (ver normalize.js)
  modelo: string;
  dataset: string;
  fold: number;
  device: string; // string livre — sem enum de tier (removido na v4.0.0 da API)
  rep: number;
  inference_time: number;
  pss_baseline?: number;
  pss_after_load?: number;
  pss_warmup?: number;
  pss_footprint?: number;
  pss_peak: number; // obrigatório
  brightness_pct?: number;
  battery_pct?: number;
  is_charging?: string;
  airplane_mode?: string;
}

/** Payload de POST /analytics (AnalyticsRequest). */
export interface AnalyticsRequest {
  data: ExperimentRecord[];
  charts?: Array<"chart1" | "chart2" | "chart3" | "chart4">;
}

/** Espelha PredictionRecord (schemas_prediction.py). */
export interface PredictionRecord {
  experimento_id: string;
  modelo: string;
  dataset: string;
  fold: number;
  y_true_idx: number;
  y_pred_idx: number;
  correct?: number; // NÃO usado no cálculo (ver 6.1 do doc) — mantido só por compatibilidade
  pred_confidence?: number;
  prob_class_0?: number;
  prob_class_1?: number;
  prob_class_2?: number;
  prob_class_3?: number;
  prob_class_4?: number;
  prob_class_5?: number;
  prob_class_6?: number;
  prob_class_7?: number;
  prob_class_8?: number;
  filename?: string;
}

/** Espelha MobileExecutionRecord (schemas_prediction.py). */
export interface MobileExecutionRecord {
  experimento_id: string;
  modelo: string;
  dataset: string;
  device: string;
  fold?: number;
  rep?: number;
  inference_time: number;
  pss_peak?: number;
}

/** Payload de POST /analytics/prediction (PredictionRequest). */
export interface PredictionRequest {
  data: PredictionRecord[];
  mobile_data?: MobileExecutionRecord[];
  charts?: Array<"chart_metrics" | "chart_pareto" | "chart_pareto_by_dataset" | "chart_f1_heatmap">;
}

// ---------------------------------------------------------------------------
// Tipos de saída do motor de cálculo (stats) — usados pelos componentes React
// ---------------------------------------------------------------------------

export interface Chart1Stats {
  dataset: string;
  n: number;
  mean: number;
  std: number | null;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  whisker_low: number;
  whisker_high: number;
  outliers: number[];
}

export interface GroupCIStats {
  dataset: string;
  modelo: string;
  device: string;
  experimento_id: string;
  n: number;
  mean: number;
  std: number | null;
  ci_lower: number;
  ci_upper: number;
}

export interface IpsStats {
  modelo: string;
  device: string;
  dataset: string;
  experimento_id: string;
  n: number;
  ips_mean: number;
  ips_ci_lower: number | null;
  ips_ci_upper: number | null;
}

export interface PerformanceStats {
  experimento_id: string;
  modelo: string;
  dataset: string;
  accuracy: number;
  std_accuracy: number | null;
  Precision: number;
  Recall: number;
  "F1-score": number;
  wP: number;
  wR: number;
  wF1: number;
}

export interface ParetoRow extends PerformanceStats {
  device: string | null;
  mean_inference_time: number | null;
  is_pareto_optimal: boolean;
}

export interface F1HeatmapRow {
  dataset: string;
  experimento_id: string;
  modelo: string;
  class: number;
  f1: number;
}
