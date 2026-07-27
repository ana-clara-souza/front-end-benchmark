// __tests__/plotBuilders.test.js
import { readFileSync } from "fs";
import { buildChart1Plot } from "../components/plotBuilders/chart1.js";
import { buildChart2Plot } from "../components/plotBuilders/chart2.js";
import { buildChart3Plot } from "../components/plotBuilders/chart3.js";
import { buildChart4Plot } from "../components/plotBuilders/chart4.js";
import { buildChartMetricsPlot } from "../components/plotBuilders/chartMetrics.js";
import { buildChartParetoPlot } from "../components/plotBuilders/chartPareto.js";
import { buildChartParetoByDatasetPlots } from "../components/plotBuilders/chartParetoByDataset.js";
import { buildChartF1HeatmapPlot } from "../components/plotBuilders/chartF1Heatmap.js";
import { buildSlotsFromFeed, CHART_REGISTRY } from "../components/chartRegistry.js";

const golden = JSON.parse(readFileSync(new URL("../golden/golden_v2.json", import.meta.url)));

function groupByDataset(rows) {
  const out = {};
  for (const r of rows) (out[r.dataset] ??= []).push(r);
  return out;
}

describe("chart1: boxplot", () => {
  test("q1/median/q3 batem exatamente com a stats já validada (modo pré-computado, sem recálculo do Plotly)", () => {
    const plot = buildChart1Plot(golden.chart1);
    const box = plot.data[0];
    expect(box.q1).toEqual(golden.chart1.map((r) => r.q1));
    expect(box.median).toEqual(golden.chart1.map((r) => r.median));
    expect(box.q3).toEqual(golden.chart1.map((r) => r.q3));
  });
});

describe("chart2: barras com IC por dataset/modelo/experimento", () => {
  test("um subplot por dataset, ordenação de modelo por média DENTRO do subplot", () => {
    const plot = buildChart2Plot(golden.chart2);
    const nDatasets = new Set(golden.chart2.map((r) => r.dataset)).size;
    expect(Object.keys(plot.layout).filter((k) => k.startsWith("xaxis")).length).toBe(nDatasets);
  });
});

describe("chart3/chart4: subplot por device, mesma ordenação global de modelo", () => {
  test("número de subplots = número de devices distintos", () => {
    const p3 = buildChart3Plot(golden.chart3);
    const nDevices = new Set(golden.chart3.map((r) => r.device)).size;
    expect(Object.keys(p3.layout).filter((k) => k.startsWith("xaxis")).length).toBe(nDevices);
  });

  test("chart3 e chart4 concordam na ordenação de modelo (mesma lógica: tempo médio ascendente)", () => {
    const p3 = buildChart3Plot(golden.chart3);
    const p4 = buildChart4Plot(golden.chart4);
    const orderFrom = (plot) => [...new Set(plot.data.filter((t) => t.xaxis === "x").flatMap((t) => t.x))];
    expect(orderFrom(p3)).toEqual(orderFrom(p4));
  });
});

describe("chart_metrics: heatmap de qualidade", () => {
  test("linhas ordenadas por accuracy descendente dentro de cada dataset", () => {
    const plot = buildChartMetricsPlot(golden.chart_metrics);
    for (const dataset of new Set(golden.chart_metrics.map((r) => r.dataset))) {
      const expected = golden.chart_metrics
        .filter((r) => r.dataset === dataset)
        .slice()
        .sort((a, b) => b.accuracy - a.accuracy)
        .map((r) => `${r.modelo} (${r.experimento_id})`);
      const trace = plot.data.find((t) => JSON.stringify(t.y) === JSON.stringify(expected));
      expect(trace).toBeDefined();
    }
  });
});

describe("chart_f1_heatmap: classes = só y_true (assimetria com chart_metrics)", () => {
  test("colunas de cada dataset batem com as classes presentes nos dados de f1 daquele dataset", () => {
    const plot = buildChartF1HeatmapPlot(golden.chart_f1_heatmap);
    plot.data.forEach((trace) => {
      expect(trace.x.every((label) => /^Class \d+$/.test(label))).toBe(true);
    });
  });
});

describe("chart_pareto: grid combinado", () => {
  test("cada modelo aparece na legenda exatamente uma vez, mesmo presente em múltiplas células", () => {
    const plot = buildChartParetoPlot(golden.chart_pareto);
    const legendCounts = {};
    plot.data.forEach((t) => {
      if (t.showlegend) legendCounts[t.name] = (legendCounts[t.name] ?? 0) + 1;
    });
    Object.values(legendCounts).forEach((count) => expect(count).toBe(1));
  });

  test("célula sem pontos válidos gera anotação 'Sem dados'", () => {
    const plot = buildChartParetoPlot(golden.chart_pareto);
    const nDatasets = new Set(golden.chart_pareto.map((r) => r.dataset)).size;
    const nDevices = new Set(golden.chart_pareto.filter((r) => r.mean_inference_time != null).map((r) => r.device)).size;
    const nCellsWithData = new Set(
      golden.chart_pareto.filter((r) => r.mean_inference_time != null).map((r) => `${r.dataset}|${r.device}`)
    ).size;
    const expectedEmpty = nDatasets * nDevices - nCellsWithData;
    const emptyAnnotations = plot.layout.annotations.filter((a) => a.text === "Sem dados");
    expect(emptyAnnotations.length).toBe(expectedEmpty);
  });
});

describe("chart_pareto_by_dataset: uma figura por dataset, cor consistente com chart_pareto", () => {
  const byDataset = groupByDataset(golden.chart_pareto);

  test("gera uma figura por dataset com mean_inference_time válido", () => {
    const figures = buildChartParetoByDatasetPlots(byDataset);
    expect(Object.keys(figures).sort()).toEqual(
      Object.keys(byDataset).filter((d) => byDataset[d].some((r) => r.mean_inference_time != null)).sort()
    );
  });

  test("mesmo modelo tem a MESMA cor no grid combinado e na figura por dataset (RF-V9)", () => {
    const combined = buildChartParetoPlot(golden.chart_pareto);
    const byDatasetFigures = buildChartParetoByDatasetPlots(byDataset);
    const modelsInBoth = combined.data.filter((t) => t.marker).map((t) => t.name);
    for (const modelo of new Set(modelsInBoth)) {
      const colorCombined = combined.data.find((t) => t.name === modelo)?.marker.color;
      for (const dataset of Object.keys(byDatasetFigures)) {
        const traceHere = byDatasetFigures[dataset].data.find((t) => t.name === modelo);
        if (traceHere) expect(traceHere.marker.color).toBe(colorCombined);
      }
    }
  });
});

describe("chartRegistry: integração completa dos 8 gráficos", () => {
  test("todos os 8 registros têm builder implementado", () => {
    expect(CHART_REGISTRY.every((c) => c.builder !== null)).toBe(true);
  });

  test("payload completo (todos os 8 pedidos) gera 9 slots (chart_pareto_by_dataset expande em 2 datasets)", () => {
    const mobileSnapshot = {
      requested: ["chart1", "chart2", "chart3", "chart4"],
      results: { chart1: golden.chart1, chart2: golden.chart2, chart3: golden.chart3, chart4: golden.chart4 },
    };
    const predictionSnapshot = {
      requested: ["chart_metrics", "chart_pareto", "chart_pareto_by_dataset", "chart_f1_heatmap"],
      results: {
        chart_metrics: golden.chart_metrics,
        chart_pareto: golden.chart_pareto,
        chart_pareto_by_dataset: groupByDataset(golden.chart_pareto),
        chart_f1_heatmap: golden.chart_f1_heatmap,
      },
    };
    const slots = buildSlotsFromFeed(mobileSnapshot, predictionSnapshot);
    expect(slots).toHaveLength(9);
    expect(slots.every((s) => s.data !== null)).toBe(true);
  });
});
