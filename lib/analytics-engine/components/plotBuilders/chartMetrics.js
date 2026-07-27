// components/plotBuilders/chartMetrics.js
//
// Replica chart_metrics_heatmap.py: um heatmap por dataset, linha =
// experimento ("{modelo} ({experimento_id})"), ordenada por accuracy
// DESCENDENTE dentro do dataset (`subset.sort_values("accuracy", ascending=False)`).
// Colunas fixas = [accuracy, Precision, Recall, F1-score]. Colormap YlGn,
// vmin=0.7/vmax=1.0 (fixo no original, não dinâmico pelos dados). Texto de
// cada célula = valor com 3 casas; só a coluna accuracy mostra o desvio
// padrão (±std_accuracy) embaixo, igual ao original. Cor do texto muda
// pra branco quando o valor é baixo (< 0.82), pra continuar legível sobre
// verde escuro.

import { computeFacetDomains, panelTitleAnnotation } from "./facetGridLayout.js";

const METRICS = ["accuracy", "Precision", "Recall", "F1-score"];
const METRIC_LABELS = ["Accuracy", "Precision (macro)", "Recall (macro)", "F1-Score (macro)"];

/**
 * @param {import('../../lib/types').PerformanceStats[]} perfRows - saída de computePerformanceDf()
 * @returns {{data: object[], layout: object}}
 */
export function buildChartMetricsPlot(perfRows) {
  const datasets = [...new Set(perfRows.map((r) => r.dataset))];
  const panels = computeFacetDomains(datasets.length, 0.08);

  const data = [];
  const layout = {
    title: "Model Quality Metrics by Experiment",
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    grid: { rows: 1, columns: datasets.length, pattern: "independent" },
    annotations: [],
  };

  datasets.forEach((dataset, i) => {
    const { xKey, yKey, xRef, yRef, domainStart, domainWidth } = panels[i];

    layout[xKey] = { domain: [domainStart, domainStart + domainWidth], side: "bottom" };
    layout[yKey] = { autorange: "reversed" }; // primeira linha (maior accuracy) no topo, como no imshow(origin padrão)

    const rows = perfRows
      .filter((r) => r.dataset === dataset)
      .slice()
      .sort((a, b) => b.accuracy - a.accuracy); // accuracy descendente, igual ao original

    const rowLabels = rows.map((r) => `${r.modelo} (${r.experimento_id})`);

    const z = rows.map((r) => METRICS.map((m) => r[m]));
    const text = rows.map((r) =>
      METRICS.map((m) => {
        if (m === "accuracy" && r.std_accuracy != null) {
          return `${r[m].toFixed(3)}<br>(±${r.std_accuracy.toFixed(3)})`;
        }
        return r[m].toFixed(3);
      })
    );
    // Texto branco em célula "fraca" (< 0.82), preto caso contrário — mesma
    // regra de legibilidade de chart_metrics_heatmap.py (`text_color = "white" if val < 0.82 else "black"`).
    const textColor = z.map((row) => row.map((v) => (v < 0.82 ? "#ffffff" : "#111827")));

    data.push({
      type: "heatmap",
      z,
      x: METRIC_LABELS,
      y: rowLabels,
      xaxis: xRef,
      yaxis: yRef,
      zmin: 0.7,
      zmax: 1.0,
      colorscale: "YlGn",
      showscale: i === datasets.length - 1, // uma colorbar só, no último painel (evita repetir 1 por dataset)
      text,
      texttemplate: "%{text}",
      textfont: { size: 11, color: textColor },
      hovertemplate: "<b>%{y}</b><br>%{x}: %{z:.3f}<extra></extra>",
    });

    layout.annotations.push(panelTitleAnnotation(`Performance — ${dataset}`, domainStart, domainWidth, 1.08));
  });

  return { data, layout };
}
