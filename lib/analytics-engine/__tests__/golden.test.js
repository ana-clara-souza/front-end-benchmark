// __tests__/golden.test.js
//
// Suíte de fidelidade (RNF-01, critério de aceite da Seção 11): compara a
// saída do motor JS byte-a-byte (com tolerância numérica) contra os golden
// files gerados a partir do motor Python ORIGINAL (etl.py, stats.py,
// etl_prediction.py, stats_prediction.py rodando de verdade, sem mock).
//
// Os payloads de entrada cobrem os 5 casos de borda pedidos na Seção 10.1:
//   1. caso simples
//   2. experimento_id repetido para o mesmo modelo+dataset (devices
//      diferentes: exp-001 vs exp-003 no device 2312CRNCCL)
//   3. assimetria de classes em y_true/y_pred (exp-001: y_pred contém uma
//      classe "2" que nunca aparece em y_true)
//   4. ausência de mobile_data para um experimento (exp-002 fica sem
//      mean_inference_time no merge do Pareto)
//   5. mean_inference_time nulo excluído antes do cálculo de dominância
//      (RF-08.1) — coberto pelo mesmo caso 4 acima.
//
// Para regenerar os golden files a partir do Python real, ver
// golden/regenerate_golden.py.txt (requer pandas/numpy/scipy/scikit-learn).

import { readFileSync } from "fs";
import { normalizeMobileRecords, normalizePredictionRecords, normalizeMobileForPrediction } from "../lib/normalize.js";
import { computeChart1Stats, computeChart2Stats, computeChart3Stats, computeChart4Stats } from "../lib/statsMobile.js";
import {
  computePerformanceDf,
  computeInferenceTimes,
  buildParetoDataset,
  computeF1HeatmapStats,
} from "../lib/predictionMetrics.js";

const golden = JSON.parse(readFileSync(new URL("../golden/golden_v1.json", import.meta.url)));

const mobileRaw = [
  { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 0, inference_time: 2033.700077, pss_peak: 126.16015625 },
  { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 1, inference_time: 2010.442, pss_peak: 128.30 },
  { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 0, inference_time: 147.335052, pss_peak: 331.59765625 },
  { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 199, inference_time: 150.812, pss_peak: 329.88 },
  { experimento_id: "exp-003", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 0, inference_time: 2100.0, pss_peak: 140.0 },
  { experimento_id: "exp-003", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 1, inference_time: 2080.0, pss_peak: 142.0 },
  { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, device: "Pixel6", rep: 0, inference_time: 80.0, pss_peak: 90.0 },
  { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, device: "Pixel6", rep: 1, inference_time: 82.0, pss_peak: 92.0 },
];

const predRaw = [
  { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 0 },
  { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
  { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 2 },
  { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 0 },
  { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 0 },
  { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
  { experimento_id: "exp-003", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 0, y_pred_idx: 1 },
  { experimento_id: "exp-003", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
  { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, y_true_idx: 0, y_pred_idx: 0 },
  { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", fold: 1, y_true_idx: 1, y_pred_idx: 1 },
];

const mobileForPredRaw = [
  { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", device: "2312CRNCCL", inference_time: 2033.700077 },
  { experimento_id: "exp-003", modelo: "resnet50", dataset: "weed6c", device: "2312CRNCCL", inference_time: 2100.0 },
  { experimento_id: "exp-004", modelo: "mobilenetv2", dataset: "deepweeds", device: "Pixel6", inference_time: 80.0 },
  // exp-002 deliberadamente ausente aqui -> mean_inference_time nulo no merge
];

const TOLERANCE = 1e-4; // RNF-01

function expectRowsClose(actual, expected) {
  expect(actual.length).toBe(expected.length);
  const sortKey = (r) => JSON.stringify(r);
  const a = [...actual].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  const e = [...expected].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  a.forEach((row, i) => {
    for (const key of Object.keys(e[i])) {
      const av = row[key];
      const ev = e[i][key];
      if (typeof ev === "number" && typeof av === "number") {
        expect(av).toBeCloseTo(ev, 4);
      } else if (Array.isArray(ev)) {
        expect(av).toEqual(expect.arrayContaining(ev));
      } else {
        expect(av).toEqual(ev);
      }
    }
  });
}

describe("Fidelidade motor JS vs golden files Python (stats.py / etl.py)", () => {
  const mobileDf = normalizeMobileRecords(mobileRaw);

  test("chart1 (boxplot PSS Peak por dataset)", () => {
    expectRowsClose(computeChart1Stats(mobileDf), golden.chart1);
  });

  test("chart2 (barras PSS Peak por dataset/modelo/device/experimento)", () => {
    expectRowsClose(computeChart2Stats(mobileDf), golden.chart2);
  });

  test("chart3 (barras tempo de inferência)", () => {
    expectRowsClose(computeChart3Stats(mobileDf), golden.chart3);
  });

  test("chart4 (barras IPS — checa inversão lower/upper, RF-04.1)", () => {
    expectRowsClose(computeChart4Stats(mobileDf), golden.chart4);
  });
});

describe("Fidelidade motor JS vs golden files Python (etl_prediction.py / stats_prediction.py)", () => {
  const predDf = normalizePredictionRecords(predRaw);
  const perfDf = computePerformanceDf(predDf);
  const mobileForPred = normalizeMobileForPrediction(mobileForPredRaw);
  const inferSummary = computeInferenceTimes(mobileForPred);
  const paretoDf = buildParetoDataset(perfDf, inferSummary);

  test("chart_metrics (classes = união y_true ∪ y_pred, RF-05.1)", () => {
    expectRowsClose(perfDf, golden.chart_metrics);
  });

  test("chart_f1_heatmap (classes = SOMENTE y_true, RF-06.1 — assimetria intencional)", () => {
    expectRowsClose(computeF1HeatmapStats(predDf), golden.chart_f1_heatmap);
  });

  test("chart_pareto (merge por experimento_id + Pareto por célula dataset×device, RF-08.1)", () => {
    expectRowsClose(paretoDf, golden.chart_pareto);
  });

  test("RF-08.1: linha sem mobile_data fica com mean_inference_time nulo e nunca é marcada Pareto-ótima", () => {
    const semMobile = paretoDf.find((r) => r.experimento_id === "exp-002");
    expect(semMobile.mean_inference_time).toBeNull();
    expect(semMobile.is_pareto_optimal).toBe(false);
  });
});

describe("Casos de borda adicionais (não cobertos pelo golden file único, testados isoladamente)", () => {
  test("Pareto é calculado por célula (dataset,device), não por dataset isolado", () => {
    const perfRows = [
      { experimento_id: "e1", modelo: "m1", dataset: "D", accuracy: 0.70 },
      { experimento_id: "e2", modelo: "m2", dataset: "D", accuracy: 0.75 },
      { experimento_id: "e3", modelo: "m3", dataset: "D", accuracy: 0.99 },
    ];
    const inferSummary = [
      { experimento_id: "e1", modelo: "m1", dataset: "D", device: "X", mean_inference_time: 500 },
      { experimento_id: "e2", modelo: "m2", dataset: "D", device: "X", mean_inference_time: 300 },
      { experimento_id: "e3", modelo: "m3", dataset: "D", device: "Y", mean_inference_time: 50 },
    ];
    const result = buildParetoDataset(perfRows, inferSummary);
    const byId = Object.fromEntries(result.map((r) => [r.experimento_id, r.is_pareto_optimal]));
    expect(byId.e1).toBe(false); // dominado por e2 dentro do device X
    expect(byId.e2).toBe(true);  // ótimo local dentro de X
    expect(byId.e3).toBe(true);  // único ponto em Y
  });

  test("RD-01: experimento_id vazio é descartado no ETL mobile", () => {
    const withEmpty = [...mobileRaw, { ...mobileRaw[0], experimento_id: "" }];
    const df = normalizeMobileRecords(withEmpty);
    expect(df.some((r) => r.experimento_id === "")).toBe(false);
    expect(df.length).toBe(mobileRaw.length);
  });

  test("round() replica round-half-to-even do Python (2.675 -> 2.67, não 2.68)", async () => {
    const { round } = await import("../lib/statsUtils.js");
    expect(round(2.675, 2)).toBe(2.67);
    expect(round(0.845, 2)).toBe(0.84);
    expect(round(0.135, 2)).toBe(0.14);
  });
});
