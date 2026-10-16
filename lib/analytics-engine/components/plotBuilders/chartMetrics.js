import { fitHeatmapFacets, panelTitleAnnotation, wrapPlain } from "./facetGridLayout.js";
import { AXIS_STYLE } from "../chartTheme.js";

const METRICS = ["accuracy", "Precision", "Recall", "F1-score"];
const METRIC_LABELS = ["Accuracy", "Precision (macro)", "Recall (macro)", "F1-Score (macro)"];

/**
 * @param {import('../../lib/types').PerformanceStats[]} perfRows - saída de computePerformanceDf()
 * @param {{width?: number}} [opts] - largura (px) em que a figura vai ser desenhada (modal mede e re-chama);
 *   o espaçamento entre painéis é calculado em px a partir dela. Default 1400 (tamanho de export).
 * @returns {{data: object[], layout: object}}
 */
export function buildChartMetricsPlot(perfRows, { width = 1400 } = {}) {
  const datasets = [...new Set(perfRows.map((r) => r.dataset))];
  const buildRowLabel = (r) => `${r.modelo}<br>(${r.experimento_id})`;

  const rowsByDataset = datasets.map((d) => perfRows.filter((r) => r.dataset === d).slice().sort((a, b) => b.accuracy - a.accuracy));
  const fit = fitHeatmapFacets({
    labelsByPanel: rowsByDataset.map((rows) => rows.map(buildRowLabel)),
    nCols: METRICS.length,
    minCellPx: 68, // "(±0.012)" em fonte 14 precisa de ~62px
    width,
  });
  const tickFont = { ...AXIS_STYLE, size: fit.tickFontSize };
  const titleLines = Math.max(...datasets.map((d) => wrapPlain(`Performance — ${d}`, Math.floor((fit.plotWidthPx + 20) / (18 * 0.68))).split("<br>").length));
  const maxRows = Math.max(...rowsByDataset.map((r) => r.length));
  const rowPx = Math.max(46, Math.round(fit.tickFontSize * 2.5 + 8)); // rótulo de 2 linhas + respiro
  const plotMargin = { t: 100 + titleLines * 24, b: 130, l: fit.margin.l, r: fit.margin.r }; // b: ticks do eixo X rotacionados -30°

  // Escala de cor dinâmica e compartilhada entre todos os painéis (ver nota acima)
  const allMetricValues = perfRows.flatMap((r) => METRICS.map((m) => r[m]));
  const dataMin = Math.min(...allMetricValues);
  const dataMax = Math.max(...allMetricValues);
  const margin = Math.max((dataMax - dataMin) * 0.1, 0.02);
  const zmin = Math.max(0, dataMin - margin);
  const zmax = Math.min(1, dataMax + margin);
  const midpoint = (zmin + zmax) / 2;

  const data = [];
  const layout = {
    title: { text: "Model Quality Metrics by Experiment", font: { size: 24 } },
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    grid: { rows: 1, columns: datasets.length, pattern: "independent" },
    annotations: [],
    margin: plotMargin,
    width: fit.width !== width ? fit.width : undefined, // só fixa se precisou alargar p/ nada se sobrepor
    height: plotMargin.t + plotMargin.b + Math.max(maxRows * rowPx, 240), // piso: com 1 experimento por dataset a célula não fica uma tira de ~46px      // altura em px proporcional ao nº de linhas (não "estica" com o modal)
  };

  datasets.forEach((dataset, i) => {
    const axisSuffix = i === 0 ? "" : i + 1;
    const xKey = `xaxis${axisSuffix}`, yKey = `yaxis${axisSuffix}`, xRef = `x${axisSuffix}`, yRef = `y${axisSuffix}`;
    const [domainStart, domainEnd] = fit.domains[i];
    const domainWidth = domainEnd - domainStart;

    // Sem automargin nos eixos Y: o espaço dos rótulos já foi reservado em px por fitHeatmapFacets
    // (automargin só mexe na margem EXTERNA e não impede o rótulo de invadir o painel vizinho).
    layout[xKey] = { domain: [domainStart, domainEnd], side: "bottom", tickfont: tickFont, tickangle: -30, automargin: true };
    layout[yKey] = { autorange: "reversed", tickfont: tickFont, automargin: i === 0 }; // primeira linha (maior accuracy) no topo, como no imshow(origin padrão)

    const rows = rowsByDataset[i]; // accuracy descendente, igual ao original

    const rowLabels = rows.map(buildRowLabel);

    const z = rows.map((r) => METRICS.map((m) => r[m]));
    const text = rows.map((r) =>
      METRICS.map((m) => {
        if (m === "accuracy" && r.std_accuracy != null) {
          return `${r[m].toFixed(3)}<br>(±${r.std_accuracy.toFixed(3)})`;
        }
        return r[m].toFixed(3);
      })
    );
    // Texto branco em célula "fraca" (abaixo do ponto médio da escala
    // dinâmica), preto caso contrário - mesma ideia de
    // chart_metrics_heatmap.py, mas o limiar agora acompanha a escala real
    // em vez de um valor fixo (0.82) calibrado pra faixa 0.7-1.0.
    const textColor = z.map((row) => row.map((v) => (v < midpoint ? "#ffffff" : "#111827")));

    data.push({
      type: "heatmap",
      z,
      x: METRIC_LABELS,
      y: rowLabels,
      xaxis: xRef,
      yaxis: yRef,
      zmin,
      zmax,
      colorscale: "YlGn",
      showscale: i === datasets.length - 1, // uma colorbar só, no último painel (evita repetir 1 por dataset)
      colorbar: { x: 1.02, len: 0.9, thickness: 20 },
      text,
      texttemplate: "%{text}",
      textfont: { size: 14, color: textColor },
      hovertemplate: "<b>%{y}</b><br>%{x}: %{z:.3f}<extra></extra>",
    });

    layout.annotations.push(panelTitleAnnotation(`Performance — ${dataset}`, domainStart, domainWidth, 1, { maxChars: Math.floor((fit.plotWidthPx + 20) / (18 * 0.68)) }));
  });

  return { data, layout };
}
