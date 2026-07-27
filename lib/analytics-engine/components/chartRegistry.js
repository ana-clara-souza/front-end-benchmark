// components/chartRegistry.js
//
// Fonte única de verdade sobre "quais gráficos existem" — cada entrada
// sabe seu domínio (mobile vs predição), como pegar o resultado bruto do
// snapshot do store, e como transformar isso em config Plotly. Isso
// substitui a lista estática que existia em App.demo.jsx (chart1Slot,
// chart2Slot, ...), que era o motivo do dashboard não responder à
// quantidade de gráficos realmente pedida.
//
// Gráficos ainda sem builder (chart3, chart4, chart_metrics, chart_pareto,
// chart_pareto_by_dataset, chart_f1_heatmap) ficam registrados com
// `builder: null` de propósito — buildSlotsFromFeed() os pula igual a um
// gráfico não solicitado, então adicionar o builder depois é a ÚNICA
// mudança necessária pra eles aparecerem no dashboard (nenhuma mudança em
// App.jsx/AnalyticsDashboardGrid).

import { buildChart1Plot } from "./plotBuilders/chart1.js";
import { buildChart2Plot } from "./plotBuilders/chart2.js";
import { buildChart3Plot } from "./plotBuilders/chart3.js";
import { buildChart4Plot } from "./plotBuilders/chart4.js";
import { buildChartMetricsPlot } from "./plotBuilders/chartMetrics.js";
import { buildChartParetoPlot } from "./plotBuilders/chartPareto.js";
import { buildChartParetoByDatasetPlots } from "./plotBuilders/chartParetoByDataset.js";
import { buildChartF1HeatmapPlot } from "./plotBuilders/chartF1Heatmap.js";

export const CHART_REGISTRY = [
  {
    id: "chart1",
    domain: "mobile",
    title: "PSS Peak by Dataset",
    filename: "chart1_pss_peak_by_dataset",
    builder: buildChart1Plot,
  },
  {
    id: "chart2",
    domain: "mobile",
    title: "Mean PSS Peak by Model, Dataset and Experiment",
    filename: "chart2_pss_peak_by_model_dataset",
    builder: buildChart2Plot,
  },
  {
    id: "chart3",
    domain: "mobile",
    title: "Inference Time by Model, Device and Experiment",
    filename: "chart3_inference_time",
    builder: buildChart3Plot,
  },
  {
    id: "chart4",
    domain: "mobile",
    title: "IPS by Model, Device and Experiment",
    filename: "chart4_ips",
    builder: buildChart4Plot,
  },
  {
    id: "chart_metrics",
    domain: "prediction",
    title: "Model Quality Metrics by Experiment",
    filename: "chart_metrics",
    builder: buildChartMetricsPlot,
  },
  {
    id: "chart_pareto",
    domain: "prediction",
    title: "Accuracy vs. Inference Time (Pareto)",
    filename: "chart_pareto",
    builder: buildChartParetoPlot,
    emptyMessage: "Solicitado, mas sem mobile_data na mensagem — o Pareto precisa do tempo de inferência do device pra cada experimento.",
  },
  {
    id: "chart_pareto_by_dataset",
    domain: "prediction",
    title: "Accuracy vs. Inference Time por Dataset",
    filename: "chart_pareto_by_dataset",
    // "multi": builder recebe o dict {dataset: rows[]} já particionado (results.chart_pareto_by_dataset)
    // e devolve um dict {dataset: {data,layout}} -> buildSlotsFromFeed() expande isso em N slots,
    // um card por dataset, em vez de 1 (ver expansão abaixo).
    multi: true,
    builder: buildChartParetoByDatasetPlots,
    emptyMessage: "Solicitado, mas sem mobile_data na mensagem — o Pareto precisa do tempo de inferência do device pra cada experimento.",
  },
  {
    id: "chart_f1_heatmap",
    domain: "prediction",
    title: "F1-Score per Class by Experiment",
    filename: "chart_f1_heatmap",
    builder: buildChartF1HeatmapPlot,
  },
];

/**
 * Monta a lista de slots pro AnalyticsDashboardGrid — SÓ inclui um chart
 * se ele estiver em `requested` (mobile.requested ou prediction.requested,
 * conforme o domínio). Um chart nunca solicitado não vira slot; um chart
 * solicitado mas sem dados (ex: pareto sem mobile_data) vira slot com
 * `data: null` + a `emptyMessage` do registro, pra diferenciar os dois
 * casos na UI (ver ChartCard.jsx).
 *
 * Função pura — não depende de React, testável isoladamente.
 *
 * @param {{requested?: string[], results?: object}|null} mobileSnapshot - feed.mobile
 * @param {{requested?: string[], results?: object}|null} predictionSnapshot - feed.prediction
 * @returns {Array<{id, title, data, layout, statsData, filename, emptyMessage}>}
 */
export function buildSlotsFromFeed(mobileSnapshot, predictionSnapshot) {
  const slots = [];

  for (const entry of CHART_REGISTRY) {
    const snapshot = entry.domain === "mobile" ? mobileSnapshot : predictionSnapshot;
    if (!snapshot) continue; // nenhuma mensagem desse domínio chegou ainda

    const wasRequested = snapshot.requested?.includes(entry.id);
    if (!wasRequested) continue; // não pedido -> nem vira card (é isso que torna o dashboard responsivo à seleção)

    const statsData = snapshot.results?.[entry.id] ?? null;

    if (entry.multi) {
      // builder "multi": statsData já vem particionado por dataset (dict),
      // builder devolve {dataset: {data,layout}} -> vira 1 slot por dataset.
      if (!statsData || entry.builder == null) {
        slots.push({
          id: entry.id,
          title: entry.title,
          filename: entry.filename,
          statsData,
          data: null,
          layout: null,
          emptyMessage: entry.builder
            ? (entry.emptyMessage ?? "Sem dados para este gráfico")
            : "Gráfico solicitado, mas o componente de visualização ainda não foi implementado nesta entrega.",
        });
        continue;
      }
      const figuresByDataset = entry.builder(statsData);
      for (const [dataset, plot] of Object.entries(figuresByDataset)) {
        slots.push({
          id: `${entry.id}:${dataset}`,
          title: `${entry.title} — ${dataset}`,
          filename: `${entry.filename}_${dataset}`,
          statsData: statsData[dataset] ?? null,
          data: plot.data,
          layout: plot.layout,
          emptyMessage: entry.emptyMessage ?? "Sem dados para este gráfico",
        });
      }
      continue;
    }

    const plot = entry.builder && statsData ? entry.builder(statsData) : { data: null, layout: null };

    slots.push({
      id: entry.id,
      title: entry.title,
      filename: entry.filename,
      statsData,
      data: plot.data,
      layout: plot.layout,
      emptyMessage: entry.builder
        ? (entry.emptyMessage ?? "Sem dados para este gráfico")
        : "Gráfico solicitado, mas o componente de visualização ainda não foi implementado nesta entrega.",
    });
  }

  return slots;
}
