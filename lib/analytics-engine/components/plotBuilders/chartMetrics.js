// components/plotBuilders/chartMetrics.js
//
// Replica chart_metrics_heatmap.py: um heatmap por dataset, linha =
// experimento ("{modelo} ({experimento_id})"), ordenada por accuracy
// DESCENDENTE dentro do dataset (`subset.sort_values("accuracy", ascending=False)`).
// Colunas fixas = [accuracy, Precision, Recall, F1-score]. Colormap YlGn.
//
// CORREÇÃO: zmin/zmax agora são dinâmicos (calculados a partir dos valores
// reais de todos os datasets), em vez de fixos em 0.7-1.0. Os valores fixos
// eram calibrados para experimentos de accuracy alta e deixavam o heatmap
// sem contraste (tudo na cor mais escura/mais clara) quando a métrica real
// cai abaixo de 0.7 - mesmo problema já corrigido no notebook Colab
// equivalente. Como só existe UM colorbar compartilhado entre os painéis
// (showscale só no último), zmin/zmax precisam ser calculados globalmente
// sobre TODOS os datasets, não por painel - senão painéis diferentes
// mostrariam cores inconsistentes com a legenda única.
//
// A cor do texto (branco/preto) também passa a usar o ponto médio da
// escala dinâmica como limiar, em vez do valor fixo 0.82.

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
    title: "Model Quality Metrics by Experiment",
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    grid: { rows: 1, columns: datasets.length, pattern: "independent" },
    annotations: [],
    margin: { t: 110, b: 60, l: 60, r: 70 },
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
      colorbar: { x: 1.02, len: 0.9 },
      text,
      texttemplate: "%{text}",
      textfont: { size: 11, color: textColor },
      hovertemplate: "<b>%{y}</b><br>%{x}: %{z:.3f}<extra></extra>",
    });

    layout.annotations.push(panelTitleAnnotation(`Performance — ${dataset}`, domainStart, domainWidth, 1.08));
  });

  return { data, layout };
}
