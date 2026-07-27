// __tests__/ingest.test.js
import { detectMessageType } from "../lib/ingest/messageType.js";
import { validateMessage } from "../lib/ingest/schema.js";
import { createInitialState, reduceIncomingMessage } from "../lib/ingest/store.js";

const mobilePayload = {
  charts: ["chart1", "chart2", "chart3", "chart4"],
  data: [
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 0, inference_time: 2033.700077, pss_baseline: 38.830078125, pss_after_load: 238.32421875, pss_warmup: 112.5615234375, pss_footprint: 126.16015625, pss_peak: 126.16015625, brightness_pct: 0, battery_pct: 15, is_charging: "YES", airplane_mode: "ON" },
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "2312CRNCCL", rep: 1, inference_time: 2010.442, pss_peak: 128.30 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 0, inference_time: 147.335052, pss_peak: 331.59765625 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, device: "SM-S908E", rep: 199, inference_time: 150.812, pss_peak: 329.88 },
  ],
};

const predPayload = {
  charts: ["chart_metrics", "chart_pareto", "chart_f1_heatmap"],
  data: [
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 3, y_pred_idx: 3 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", fold: 1, y_true_idx: 5, y_pred_idx: 2 },
  ],
  mobile_data: [
    { experimento_id: "exp-001", modelo: "resnet50", dataset: "weed6c", device: "2312CRNCCL", inference_time: 2033.700077 },
    { experimento_id: "exp-002", modelo: "resnet50", dataset: "weed6c", device: "SM-S908E", inference_time: 147.335052 },
  ],
};

describe("detectMessageType — sem rota HTTP para diferenciar", () => {
  test("payload mobile é detectado corretamente", () => {
    expect(detectMessageType(mobilePayload)).toBe("mobile");
  });
  test("payload de predição é detectado corretamente", () => {
    expect(detectMessageType(predPayload)).toBe("prediction");
  });
  test("payload sem charts, só pela forma de data[0]", () => {
    expect(detectMessageType({ data: mobilePayload.data })).toBe("mobile");
    expect(detectMessageType({ data: predPayload.data })).toBe("prediction");
  });
});

describe("validateMessage — Zod substitui o 422 do Pydantic", () => {
  test("mobile válido passa", () => {
    expect(validateMessage("mobile", mobilePayload).ok).toBe(true);
  });
  test("RD-01: experimento_id vazio é rejeitado (não silenciosamente descartado)", () => {
    const bad = { ...mobilePayload, data: [{ ...mobilePayload.data[0], experimento_id: "" }] };
    const result = validateMessage("mobile", bad);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/experimento_id/);
  });
  test("campo obrigatório ausente é rejeitado", () => {
    const bad = { ...mobilePayload, data: [{ ...mobilePayload.data[0], pss_peak: undefined }] };
    expect(validateMessage("mobile", bad).ok).toBe(false);
  });
});

describe("reduceIncomingMessage — cada mensagem substitui o snapshot do seu domínio (sem upsert entre mensagens)", () => {
  test("mensagem mobile válida popula state.mobile e não mexe em state.prediction", () => {
    const state = reduceIncomingMessage(createInitialState(), mobilePayload);
    expect(state.lastError).toBeNull();
    expect(state.mobile.results.chart2.length).toBe(2); // exp-001, exp-002
    expect(state.prediction).toBeNull();
  });

  test("charts parcial: gráficos não pedidos ficam null", () => {
    const state = reduceIncomingMessage(createInitialState(), { ...mobilePayload, charts: ["chart2"] });
    expect(state.mobile.results.chart1).toBeNull();
    expect(state.mobile.results.chart2).not.toBeNull();
  });

  test("mensagem malformada preserva o último snapshot bom e reporta erro", () => {
    let state = reduceIncomingMessage(createInitialState(), mobilePayload);
    const goodSnapshot = state.mobile;
    const bad = { ...mobilePayload, data: [{ ...mobilePayload.data[0], experimento_id: "" }] };
    state = reduceIncomingMessage(state, bad);
    expect(state.lastError).not.toBeNull();
    expect(state.mobile).toBe(goodSnapshot); // mesma referência: não recalculou
  });

  test("segunda mensagem mobile SUBSTITUI a primeira (não acumula entre mensagens)", () => {
    let state = reduceIncomingMessage(createInitialState(), mobilePayload);
    const second = {
      charts: ["chart2"],
      data: [{ experimento_id: "exp-999", modelo: "inceptionv3", dataset: "deepweeds", fold: 1, device: "Pixel8", rep: 0, inference_time: 55, pss_peak: 60 }],
    };
    state = reduceIncomingMessage(state, second);
    expect(state.mobile.results.chart2.every((r) => r.experimento_id === "exp-999")).toBe(true);
  });

  test("mensagem de predição sem mobile_data: chart_pareto null, chart_metrics ok", () => {
    const withoutMobileData = { ...predPayload, mobile_data: undefined };
    const state = reduceIncomingMessage(createInitialState(), withoutMobileData);
    expect(state.prediction.results.chart_pareto).toBeNull();
    expect(state.prediction.results.chart_metrics.length).toBe(2);
  });

  test("mensagem de predição com mobile_data: chart_pareto calculado", () => {
    const state = reduceIncomingMessage(createInitialState(), predPayload);
    expect(state.prediction.results.chart_pareto.length).toBe(2);
    expect(state.prediction.results.chart_pareto[0].device).not.toBeNull();
  });

  test("mobile e predição são slots independentes: mensagens intercaladas não se apagam", () => {
    let state = reduceIncomingMessage(createInitialState(), mobilePayload);
    state = reduceIncomingMessage(state, predPayload);
    expect(state.mobile).not.toBeNull(); // preservado
    expect(state.prediction).not.toBeNull(); // recém-chegado
  });
});
