
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

// Formato de font do Plotly é {size, color} — não confundir com o padrão
// Recharts ({fontSize, fill}), que não tem efeito nenhum se passado pro
// tickfont/titlefont de um layout do Plotly (a lib ignora chaves
// desconhecidas e cai no tamanho default, bem menor que o do script).
export const AXIS_STYLE = {
  size: 16,
  color: "#374151",
};

export const GRID_STYLE = {
  stroke: "#e5e7eb",
  strokeDasharray: "4 4",
};

// Fontsize de legenda dos scripts originais
export const PREDICTION_LEGEND_FONT_SIZE = 20; // benchmark_gráficos_avaliação_predição.py
export const MOBILE_LEGEND_FONT_SIZE = 20;     // benchmark_mobile.py
export const HEATMAP_COLORBAR_FONT_SIZE = 20;  // heatmaps (colorbar faz papel de legenda)

/**
 * Plotly 3.x removeu `titlefont` (e o título de eixo em string perde o estilo).
 * A forma {text, font} funciona em qualquer versão.
 */
export function axisTitle(text, size = AXIS_STYLE.size) {
  return text ? { text, font: { size, color: AXIS_STYLE.color } } : { text: "" };
}

/** Quebra texto longo em várias linhas (<br>) nos espaços, para rótulos de tick/título não invadirem o vizinho. */
export function wrapLabel(text, maxChars = 22) {
  const words = String(text).split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) { lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lines.join("<br>");
}

// ---------------------------------------------------------------------------
// Helpers de LAYOUT (só design — nenhum cálculo/escala passa por aqui)
// ---------------------------------------------------------------------------

/**
 * Altura (px) que uma legenda horizontal ocupa, estimada pelo texto real, p/ reservar margem inferior
 * suficiente em vez de deixar a legenda cair em cima do título do eixo X / rótulos dos ticks.
 */
export function legendBlockPx(names, { fontSize = 16, width = 1400 } = {}) {
  const itemPx = names.map((n) => 36 + Math.ceil(String(n).length * fontSize * 0.6) + 18);
  let rows = 1, rowW = 0;
  for (const w of itemPx) {
    if (rowW + w > width - 100 && rowW > 0) { rows++; rowW = w; } else rowW += w;
  }
  return { rows, heightPx: rows * Math.round(fontSize * 1.5) + 16 };
}

/** Fonte da legenda proporcional ao nº de entradas (muitas entradas com fonte 20 estouravam a figura). */
export function legendFontFor(nEntries, base = 20) {
  if (nEntries <= 4) return base;
  if (nEntries <= 8) return Math.min(base, 16);
  return Math.min(base, 13);
}

/**
 * Título da figura ancorado NO TOPO do container (yref "container"), e não em coordenada de paper:
 * assim ele nunca invade os títulos dos subplots, que ficam logo acima da área de plotagem.
 */
export function figureTitle(text, size = 22) {
  return { text, font: { size }, x: 0.5, xanchor: "center", y: 1, yanchor: "top", yref: "container", pad: { t: 14 } };
}

/** Título de painel (device/dataset) logo acima do domínio do subplot, crescendo para cima. */
export function panelHeading(text, xCenter, size = 18) {
  return { text: `<b>${text}</b>`, showarrow: false, x: xCenter, xref: "paper", xanchor: "center", y: 1, yref: "paper", yanchor: "bottom", yshift: 8, font: { size } };
}
