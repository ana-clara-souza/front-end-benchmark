import { fitHeatmapFacets, panelTitleAnnotation, wrapPlain } from "./facetGridLayout.js";
import { HEATMAP_COLORBAR_FONT_SIZE, AXIS_STYLE } from "../chartTheme.js";

// CORREÇÃO: zmin/zmax dinâmicos em vez de fixos (0.5-1.0), pelo mesmo
// motivo do chartMetrics.js - calibrados pra F1 alto, ficavam sem
// contraste quando o F1 real cai abaixo de 0.5 (mesmo problema já
// corrigido no notebook Colab equivalente). Calculados globalmente sobre
// TODOS os datasets porque só existe um colorbar compartilhado
// (showscale só no último painel).
export function buildChartF1HeatmapPlot(f1Rows, { width = 1400 } = {}) {
  const datasets = [...new Set(f1Rows.map((r) => r.dataset))];
  const labelOf = (r) => `${r.modelo}<br>(${r.experimento_id})`;

  // linhas (experimentos) e classes de cada painel — calculadas antes do layout p/ dimensionar em px
  const panelInfo = datasets.map((dataset) => {
    const rowsForDataset = f1Rows.filter((r) => r.dataset === dataset);
    const experimentos = [...new Set(rowsForDataset.map((r) => r.experimento_id))].sort();
    const classes = [...new Set(rowsForDataset.map((r) => r.class))].sort((a, b) => a - b);
    const rowLabels = experimentos.map((expId) => labelOf(rowsForDataset.find((r) => r.experimento_id === expId)));
    return { rowsForDataset, experimentos, classes, rowLabels };
  });
  const fit = fitHeatmapFacets({
    labelsByPanel: panelInfo.map((p) => p.rowLabels),
    nCols: Math.max(...panelInfo.map((p) => p.classes.length)),
    minCellPx: 40,
    width,
  });
  const tickFont = { ...AXIS_STYLE, size: fit.tickFontSize };
  const maxChars = Math.floor((fit.plotWidthPx + 20) / (18 * 0.68));
  const titleLines = Math.max(...datasets.map((d) => wrapPlain(`F1-Score per Class — ${d}`, maxChars).split("<br>").length));
  const maxRows = Math.max(...panelInfo.map((p) => p.experimentos.length));
  const rowPx = Math.max(46, Math.round(fit.tickFontSize * 2.5 + 8));
  const plotMargin = { t: 100 + titleLines * 24, b: 80, l: fit.margin.l, r: fit.margin.r };

  const allF1 = f1Rows.map((r) => r.f1).filter((v) => v != null);
  const dataMin = Math.min(...allF1);
  const dataMax = Math.max(...allF1);
  const margin = Math.max((dataMax - dataMin) * 0.1, 0.02);
  const zmin = Math.max(0, dataMin - margin);
  const zmax = Math.min(1, dataMax + margin);

  const data = [];
  const layout = {
    title: { text: "F1-Score per Class by Experiment", font: { size: 24 } },
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    grid: { rows: 1, columns: datasets.length, pattern: "independent" },
    annotations: [],
    margin: plotMargin,
    width: fit.width !== width ? fit.width : undefined,
    height: plotMargin.t + plotMargin.b + Math.max(maxRows * rowPx, 240), // piso: com 1 experimento por dataset a célula não fica uma tira de ~46px
  };

  datasets.forEach((dataset, i) => {
    const axisSuffix = i === 0 ? "" : i + 1;
    const xKey = `xaxis${axisSuffix}`, yKey = `yaxis${axisSuffix}`, xRef = `x${axisSuffix}`, yRef = `y${axisSuffix}`;
    const [domainStart, domainEnd] = fit.domains[i];
    const domainWidth = domainEnd - domainStart;

    layout[xKey] = { domain: [domainStart, domainEnd], tickfont: tickFont, automargin: true };
    layout[yKey] = { autorange: "reversed", tickfont: tickFont, automargin: i === 0 };

    const { rowsForDataset, experimentos, classes, rowLabels } = panelInfo[i];
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
      colorbar: { x: 1.02, len: 0.9, thickness: 20, tickfont: { size: HEATMAP_COLORBAR_FONT_SIZE } },
      hovertemplate: "<b>%{y}</b><br>%{x}: F1 = %{z:.3f}<extra></extra>",
    });

    layout.annotations.push(panelTitleAnnotation(`F1-Score per Class — ${dataset}`, domainStart, domainWidth, 1, { maxChars }));
  });

  return { data, layout };
}
