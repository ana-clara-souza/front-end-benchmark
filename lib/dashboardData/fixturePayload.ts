// lib/dashboardData/fixturePayload.ts
//
// ATENÇÃO — TEMPORÁRIO: enquanto a página de filtro (fora de escopo desta
// integração) não existir, este é o payload que alimenta o dashboard, só
// pra deixar a página navegável/demonstrável. Assim que a página de filtro
// passar a chamar `deliverPayload(...)` de verdade (ver
// AnalyticsPayloadContext.tsx), este arquivo — e o seed automático que o
// usa — podem ser removidos sem tocar em mais nada (dashboard/page.tsx não
// importa este arquivo diretamente, só o Provider o conhece).
//
// Os registros abaixo não são inventados soltos: são os mesmos usados para
// gerar golden_v2.json (lib/analytics-engine/golden/), ou seja, já
// passaram pela validação de fidelidade contra o motor Python original —
// exercitam múltiplos datasets, múltiplos devices por dataset e
// experimento_id repetido (2 reps por experimento), então os 8 gráficos
// têm algo significativo pra desenhar (facetas, fronteira de Pareto com
// mais de um device por dataset, etc.).

import type { AnalyticsMessage } from "./AnalyticsPayloadContext";

const mobileMessage: AnalyticsMessage = {
  charts: ["chart1", "chart2", "chart3", "chart4"],
  data: [
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 0, inference_time: 2033.7, pss_peak: 126.16 },
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 1, inference_time: 2010.4, pss_peak: 128.30 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 0, inference_time: 147.34, pss_peak: 331.60 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 199, inference_time: 150.81, pss_peak: 329.88 },
    { experimento_id: "exp-005", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 0, inference_time: 55.0, pss_peak: 90.0 },
    { experimento_id: "exp-005", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 1, inference_time: 57.0, pss_peak: 92.0 },
    { experimento_id: "exp-006", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 0, inference_time: 210.0, pss_peak: 95.0 },
    { experimento_id: "exp-006", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 1, inference_time: 215.0, pss_peak: 97.0 },
    { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, device: "Pixel6", rep: 0, inference_time: 80.0, pss_peak: 90.0 },
    { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, device: "Pixel6", rep: 1, inference_time: 82.0, pss_peak: 92.0 },
    { experimento_id: "exp-007", modelo: "resnet50", dataset: "deepweeds", fold: 1, device: "Pixel6", rep: 0, inference_time: 180.0, pss_peak: 150.0 },
    { experimento_id: "exp-007", modelo: "resnet50", dataset: "deepweeds", fold: 1, device: "Pixel6", rep: 1, inference_time: 185.0, pss_peak: 155.0 },
  ],
};

const predictionMessage: AnalyticsMessage = {
  charts: ["chart_metrics", "chart_pareto", "chart_pareto_by_dataset", "chart_f1_heatmap"],
  data: [
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 0 },
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 2 },
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 0 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 0 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
    { experimento_id: "exp-005", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 1 },
    { experimento_id: "exp-005", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
    { experimento_id: "exp-006", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 0 },
    { experimento_id: "exp-006", modelo: "mobilenetv2", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 0 },
    { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, y_true_idx: 0, y_pred_idx: 0 },
    { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
    { experimento_id: "exp-007", modelo: "resnet50", dataset: "deepweeds", fold: 1, y_true_idx: 0, y_pred_idx: 1 },
    { experimento_id: "exp-007", modelo: "resnet50", dataset: "deepweeds", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
  ],
  mobile_data: mobileMessage.data.map((r) => ({
    experimento_id: r.experimento_id,
    modelo: r.modelo,
    dataset: r.dataset,
    device: r.device,
    inference_time: r.inference_time,
  })),
};

/** As duas mensagens que, juntas, alimentam os 8 gráficos (4 mobile + 4 predição). */
export const FIXTURE_MESSAGES: AnalyticsMessage[] = [mobileMessage, predictionMessage];
