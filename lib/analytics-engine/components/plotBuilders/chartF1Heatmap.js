// components/plotBuilders/chartF1Heatmap.js
//
// computeF1HeatmapStats() devolve uma lista PLANA (uma linha por
// dataset+experimento+classe) — igual ao formato de stats do backend
// original. Pra virar heatmap, este builder faz o trabalho inverso do
// chart_f1_heatmap.py: pivota de volta pra matriz [experimento x classe]
// por dataset. Linhas ordenadas por experimento_id (sorted, não por
// nenhuma métrica — igual ao original: `experimentos = sorted(...)`).
// Colunas = classes ÚNICAS DE y_true PRESENTES NAQUELE DATASET (já
// determinado corretamente na camada de stats — este builder só usa o
// que já veio calculado, não re-decide quais classes existem).
//
// Sem anotação de texto por célula — o original (chart_f1_heatmap.py)
// só faz `ax.imshow` + colorbar, nunca `ax.text()`, diferente de
// chart_metrics_heatmap.py. Mantido assim de propósito.

import { computeFacetDomains, panelTitleAnnotation } from "./facetGridLayout.js";

export function buildChartF1HeatmapPlot(f1Rows) {
  const datasets = [...new Set(f1Rows.map((r) => r.dataset))];
  const panels = computeFacetDomains(datasets.length, 0.08);

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
      zmin: 0.5,
      zmax: 1.0,
      colorscale: "Viridis",
      showscale: i === datasets.length - 1,
      hovertemplate: "<b>%{y}</b><br>%{x}: F1 = %{z:.3f}<extra></extra>",
    });

    layout.annotations.push(panelTitleAnnotation(`F1-Score per Class — ${dataset}`, domainStart, domainWidth, 1.08));
  });

  return { data, layout };
}
