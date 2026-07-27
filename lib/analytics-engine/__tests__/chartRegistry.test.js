// __tests__/chartRegistry.test.js
import { buildSlotsFromFeed, CHART_REGISTRY } from "../components/chartRegistry.js";

describe("buildSlotsFromFeed — dashboard responsivo à quantidade de gráficos pedidos", () => {
  test("registro tem as 8 opções de gráfico da API", () => {
    expect(CHART_REGISTRY).toHaveLength(8);
    expect(CHART_REGISTRY.map((c) => c.id)).toEqual([
      "chart1", "chart2", "chart3", "chart4",
      "chart_metrics", "chart_pareto", "chart_pareto_by_dataset", "chart_f1_heatmap",
    ]);
  });

  test("só um gráfico pedido -> só um slot (não os outros 7)", () => {
    const mobile = { requested: ["chart2"], results: { chart2: [{ dataset: "X", modelo: "m", device: "d", experimento_id: "e", n: 2, mean: 10, std: 1, ci_lower: 8, ci_upper: 12 }] } };
    const slots = buildSlotsFromFeed(mobile, null);
    expect(slots.map((s) => s.id)).toEqual(["chart2"]);
  });

  test("nenhuma mensagem de um domínio ainda chegou -> nenhum slot desse domínio", () => {
    const mobile = { requested: ["chart1"], results: { chart1: [] } };
    const slots = buildSlotsFromFeed(mobile, null); // prediction = null (nunca chegou)
    expect(slots.every((s) => s.id.startsWith("chart1") || s.id.startsWith("chart2") || s.id === "chart3" || s.id === "chart4")).toBe(true);
    expect(slots.some((s) => s.id.startsWith("chart_"))).toBe(false);
  });

  test("gráfico pedido mas sem dados (ex: pareto sem mobile_data) ainda vira slot, com emptyMessage", () => {
    const prediction = { requested: ["chart_pareto"], results: { chart_pareto: null } };
    const slots = buildSlotsFromFeed(null, prediction);
    expect(slots).toHaveLength(1);
    expect(slots[0].data).toBeNull();
    expect(slots[0].emptyMessage).toBeTruthy();
  });

  test("gráfico NÃO pedido nunca vira slot, mesmo que o snapshot exista", () => {
    const mobile = { requested: ["chart1"], results: { chart1: [], chart2: [{ dataset: "X" }] } }; // chart2 tem dado mas não foi requested
    const slots = buildSlotsFromFeed(mobile, null);
    expect(slots.map((s) => s.id)).toEqual(["chart1"]);
  });

  test("todos os 8 pedidos -> 8 slots (mesmo os sem builder implementado ainda)", () => {
    const mobile = { requested: ["chart1", "chart2", "chart3", "chart4"], results: { chart1: [], chart2: [], chart3: [], chart4: [] } };
    const prediction = { requested: ["chart_metrics", "chart_pareto", "chart_pareto_by_dataset", "chart_f1_heatmap"], results: { chart_metrics: [], chart_pareto: null, chart_pareto_by_dataset: null, chart_f1_heatmap: [] } };
    const slots = buildSlotsFromFeed(mobile, prediction);
    expect(slots).toHaveLength(8);
  });

  test("cada slot tem title, filename e statsData preenchidos", () => {
    const mobile = { requested: ["chart1"], results: { chart1: [{ dataset: "X", n: 1, mean: 1, std: null, min: 1, q1: 1, median: 1, q3: 1, max: 1, iqr: 0, whisker_low: 1, whisker_high: 1, outliers: [] }] } };
    const slots = buildSlotsFromFeed(mobile, null);
    expect(slots[0].title).toBeTruthy();
    expect(slots[0].filename).toBeTruthy();
    expect(slots[0].statsData).toEqual(mobile.results.chart1);
    expect(slots[0].data).not.toBeNull(); // builder implementado, deve ter gerado config Plotly
  });
});
