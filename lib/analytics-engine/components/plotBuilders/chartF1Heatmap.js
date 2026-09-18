import { computeFacetDomains, panelTitleAnnotation } from "./facetGridLayout.js";
import { HEATMAP_COLORBAR_FONT_SIZE } from "../chartTheme.js";

// CORREÇÃO: zmin/zmax dinâmicos em vez de fixos (0.5-1.0), pelo mesmo
// motivo do chartMetrics.js - calibrados pra F1 alto, ficavam sem
// contraste quando o F1 real cai abaixo de 0.5 (mesmo problema já
// corrigido no notebook Colab equivalente). Calculados globalmente sobre
// TODOS os datasets porque só existe um colorbar compartilhado
// (showscale só no último painel).
export function buildChartF1HeatmapPlot(f1Rows) {
  const datasets = [...new Set(f1Rows.map((r) => r.dataset))];
  const panels = computeFacetDomains(datasets.length, 0.08);

  const allF1 = f1Rows.map((r) => r.f1).filter((v) => v != null);
  const dataMin = Math.min(...allF1);
  const dataMax = Math.max(...allF1);
  const margin = Math.max((dataMax - dataMin) * 0.1, 0.02);
  const zmin = Math.max(0, dataMin - margin);
  const zmax = Math.min(1, dataMax + margin);

  const data = [];
  const layout = {
    title: "F1-Score per Class by Dataset and Experiment",
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    grid: { rows: 1, columns: datasets.length, pattern: "independent" },
    annotations: [],
  };

  datasets.forEach((dataset, i) => {
    const { xKey, yKey, xRef, yRef, domainStart, domainWidth } = panels[i];

    layout[xKey] = { domain: [domainStart, domainStart + domainWidth] };
    layout[yKey] = { autorange: "reversed" };

    const rowsForDataset = f1Rows.filter((r) => r.dataset === dataset);
    const experimentos = [...new Set(rowsForDataset.map((r) => r.experimento_id))].sort();
    const classes = [...new Set(rowsForDataset.map((r) => r.class))].sort((a, b) => a - b);

    const rowLabels = experimentos.map((expId) => {
      const modelo = rowsForDataset.find((r) => r.experimento_id === expId).modelo;
      return `${modelo} (${expId})`;
    });
    const colLabels = classes.map((c) => `Class ${c}`);

    const byExpAndClass = new Map(rowsForDataset.map((r) => [`${r.experimento_id}␟${r.class}`, r.f1]));
    const z = experimentos.map((expId) => classes.map((c) => byExpAndClass.get(`${expId}␟${c}`) ?? null));

    data.push({
      type: "heatmap",
      z,
      x: colLabels,
      y: rowLabels,
      xaxis: xRef,
      yaxis: yRef,
      zmin,
      zmax,
      colorscale: "Viridis",
      showscale: i === datasets.length - 1,
      colorbar: { tickfont: { size: HEATMAP_COLORBAR_FONT_SIZE } },
      hovertemplate: "<b>%{y}</b><br>%{x}: F1 = %{z:.3f}<extra></extra>",
    });

    layout.annotations.push(panelTitleAnnotation(`F1-Score per Class — ${dataset}`, domainStart, domainWidth, 1.08));
  });

  return { data, layout };
}
