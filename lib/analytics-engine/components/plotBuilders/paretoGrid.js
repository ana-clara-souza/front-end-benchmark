// components/plotBuilders/paretoGrid.js
//
// Lógica compartilhada entre chartPareto.js (grade combinada — todos os
// datasets × união de devices) e chartParetoByDataset.js (uma figura por
// dataset — grade 1×devices daquele dataset). Replica chart_pareto.py:
// _row_y_lim, _plot_cell (aqui virou buildCellTraces), e o mapa de
// cor/marcador consistente por modelo (_build_color_marker_maps).

import { TAB10, MARKERS } from "../chartTheme.js";

/**
 * Cor/marcador por modelo — DEVE ser derivado da lista COMPLETA de
 * modelos (todo o pareto_df, não um subset por dataset), pra "mesmo
 * modelo = mesma cor/marcador" entre chart_pareto e cada figura de
 * chart_pareto_by_dataset (RF-V9). Ordenado por nome, não por ordem de
 * aparição — determinístico entre re-renders.
 */
export function buildModelColorMarkerMaps(allRows) {
  const models = [...new Set(allRows.map((r) => r.modelo))].sort();
  const colorMap = {};
  const markerMap = {};
  models.forEach((m, i) => {
    colorMap[m] = TAB10[i % TAB10.length];
    markerMap[m] = MARKERS[i % MARKERS.length];
  });
  return { colorMap, markerMap, models };
}

/**
 * Escala de Y (accuracy) compartilhada entre as colunas da MESMA linha
 * (dataset) — calculada a partir de TODOS os pontos válidos daquele
 * dataset (todas as devices), igual a `_row_y_lim()`: min/max com 15% de
 * padding, sem hardcode de limites por nome de dataset conhecido (aqui
 * dataset é string livre).
 */
export function computeRowYLim(rowData) {
  if (rowData.length === 0) return [0, 1];
  const accs = rowData.map((r) => r.accuracy);
  const min = Math.min(...accs);
  const max = Math.max(...accs);
  const padding = Math.max((max - min) * 0.15, 0.01);
  return [Math.max(0, min - padding), Math.min(1, max + padding)];
}

/**
 * Monta as traces de uma única célula (dataset, device): um scatter por
 * modelo presente na célula (pontos anotados com experimento_id, já que
 * uma célula pode ter mais de um ponto do mesmo modelo — reexecuções em
 * experimentos diferentes) + a linha de fronteira de Pareto local àquela
 * célula. `shownModels`/`paretoLegendShown` controlam se a legenda desse
 * modelo/da fronteira já apareceu em outra célula, pra a legenda global
 * da figura não repetir a mesma entrada por painel.
 */
export function buildCellTraces(cell, xRef, yRef, colorMap, markerMap, shownModels, paretoLegendShown) {
  const traces = [];

  if (cell.length === 0) return traces; // célula vazia -> layout cuida da anotação "Sem dados"

  const byModel = new Map();
  for (const row of cell) {
    if (!byModel.has(row.modelo)) byModel.set(row.modelo, []);
    byModel.get(row.modelo).push(row);
  }

  for (const [modelo, rows] of byModel) {
    const alreadyShown = shownModels.has(modelo);
    traces.push({
      type: "scatter",
      mode: "markers+text",
      x: rows.map((r) => r.mean_inference_time),
      y: rows.map((r) => r.accuracy),
      text: rows.map((r) => r.experimento_id),
      textposition: "top right",
      textfont: { size: 9, color: "#6b7280" },
      marker: { color: colorMap[modelo], symbol: markerMap[modelo], size: 11 },
      name: modelo,
      legendgroup: modelo,
      showlegend: !alreadyShown,
      xaxis: xRef,
      yaxis: yRef,
      hovertemplate: `<b>${modelo}</b><br>%{text}<br>Accuracy: %{y:.3f}<br>Tempo: %{x:.1f} ms<extra></extra>`,
    });
    shownModels.add(modelo);
  }

  const paretoPts = cell.filter((r) => r.is_pareto_optimal).slice().sort((a, b) => a.mean_inference_time - b.mean_inference_time);
  if (paretoPts.length > 0) {
    const alreadyShown = paretoLegendShown.shown;
    traces.push({
      type: "scatter",
      mode: "lines",
      x: paretoPts.map((r) => r.mean_inference_time),
      y: paretoPts.map((r) => r.accuracy),
      line: { color: "royalblue", dash: "dash", width: 2 },
      name: "Pareto Frontier",
      legendgroup: "pareto-frontier",
      showlegend: !alreadyShown,
      xaxis: xRef,
      yaxis: yRef,
      hoverinfo: "skip",
    });
    paretoLegendShown.shown = true;
  }

  return traces;
}

/** Anotação "Sem dados" centralizada numa célula vazia — equivalente ao ax.text(...) do _plot_cell original quando a célula não tem pontos. */
export function emptyCellAnnotation(xDomain, yDomain) {
  return {
    text: "Sem dados",
    showarrow: false,
    x: (xDomain[0] + xDomain[1]) / 2,
    xref: "paper",
    y: (yDomain[0] + yDomain[1]) / 2,
    yref: "paper",
    font: { size: 11, color: "#9ca3af" },
  };
}
