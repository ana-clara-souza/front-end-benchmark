// components/chartTheme.js
//
// RF-V11 do documento de requisitos: em vez de aproximar a paleta `tab10`
// do matplotlib via d3-scale-chromatic (schemeTableau10, que tem hex
// diferentes), extraímos os hex EXATOS de `plt.get_cmap("tab10").colors`
// rodando o matplotlib de verdade. Isso resolve RF-V11 como fidelidade
// exata, não "aproximação aceitável" — sem custo de dependência extra.

// plt.get_cmap("tab10").colors, em ordem — hex exatos (não aproximados).
export const TAB10 = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

// Marcadores do Plotly usados em chart_pareto — mesma ordem/ideia da lista
// MARKERS de chart_pareto.py (o, s, D, ^, v, <, >, P, *, X, h, p), mapeados
// para os símbolos equivalentes que o Plotly aceita.
export const MARKERS = [
  "circle", "square", "diamond", "triangle-up", "triangle-down",
  "triangle-left", "triangle-right", "cross", "star", "x", "hexagon", "pentagon",
];

/**
 * RF-V9: cor/marcador por modelo devem ser determinísticos e estáveis
 * entre re-renderizações e entre a visão combinada e a visão por dataset
 * do Pareto — "mesmo modelo = mesma cor/marcador sempre, ordenados por
 * nome do modelo, não por ordem de aparição nos dados" (RF-V9 literal).
 *
 * Por isso esta função NUNCA deve receber uma lista já filtrada/parcial de
 * modelos para decidir a cor de um subset (ex: só os modelos de um
 * dataset) — sempre passe a lista COMPLETA de modelos únicos do dataset
 * inteiro (pareto_df completo), igual a _build_color_marker_maps() em
 * chart_pareto.py, que deriva os mapas do df completo antes de particionar
 * por dataset em generate_by_dataset().
 *
 * @param {string[]} allModels - lista de nomes de modelo já ordenada por nome
 * @returns {{colorMap: Record<string,string>, markerMap: Record<string,string>}}
 */
export function buildModelColorMarkerMaps(allModels) {
  const sorted = [...new Set(allModels)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const colorMap = {};
  const markerMap = {};
  sorted.forEach((modelo, i) => {
    colorMap[modelo] = TAB10[i % TAB10.length];
    markerMap[modelo] = MARKERS[i % MARKERS.length];
  });
  return { colorMap, markerMap };
}

/** Cor determinística para uma chave arbitrária (grupos de barra, ex: "exp-001 (device)"), não específica de modelo. */
const groupColorCache = new Map();
export function colorForGroup(key) {
  if (groupColorCache.has(key)) return groupColorCache.get(key);
  const color = TAB10[groupColorCache.size % TAB10.length];
  groupColorCache.set(key, color);
  return color;
}

export const AXIS_STYLE = {
  fontSize: 22,
  fill: "#374151",
};

export const GRID_STYLE = {
  stroke: "#e5e7eb",
  strokeDasharray: "4 4",
};

// Fontsize de legenda dos scripts originais
export const PREDICTION_LEGEND_FONT_SIZE = 22; // benchmark_gráficos_avaliação_predição.py
export const MOBILE_LEGEND_FONT_SIZE = 22;     // benchmark_mobile.py
export const HEATMAP_COLORBAR_FONT_SIZE = 22;  // heatmaps (colorbar faz papel de legenda)
