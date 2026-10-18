import { TAB10, MARKERS } from "../chartTheme.js";


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

export function computeRowYLim(rowData) {
  if (rowData.length === 0) return [0, 1];
  const accs = rowData.map((r) => r.accuracy);
  const min = Math.min(...accs);
  const max = Math.max(...accs);
  const padding = Math.max((max - min) * 0.15, 0.01);
  return [Math.max(0, min - padding), Math.min(1, max + padding)];
}

/**
 * Rótulo (texto + posição) de cada ponto da célula, calculado na célula INTEIRA (não por modelo) para
 * que pontos vizinhos não escrevam o texto por cima um do outro:
 *  - texto repetido na célula (ex: 4 modelos mobile cruzados com o MESMO experimento -> 4 pontos com o
 *    mesmo id e a mesma acurácia) é escrito só UMA vez; os demais ficam sem texto (o hover mostra tudo);
 *  - pontos ordenados por tempo alternam acima/abaixo (top/bottom center), então vizinhos próximos em X
 *    não dividem o mesmo lado;
 *  - ponto colado na borda de cima/baixo do eixo escreve o texto para DENTRO do gráfico, senão o rótulo
 *    invadia o título do painel (borda de cima) ou os ticks do eixo X (borda de baixo).
 */
export function computeCellLabels(cell, yLim) {
  const span = Math.max(1e-9, (yLim?.[1] ?? 1) - (yLim?.[0] ?? 0));
  const nearTop = (y) => yLim && y >= yLim[1] - span * 0.18;
  const nearBottom = (y) => yLim && y <= yLim[0] + span * 0.18;
  const order = cell.map((r, i) => i).sort((a, b) => cell[a].mean_inference_time - cell[b].mean_inference_time);
  const seen = new Set();
  const labels = new Map(); // row -> {text, position}
  order.forEach((idx, rank) => {
    const r = cell[idx];
    const raw = String(r.experimento_id ?? "");
    const text = seen.has(raw) ? "" : raw;
    seen.add(raw);
    // A fronteira sobe da esquerda-embaixo p/ a direita-em-cima, então os quadrantes livres são
    // "acima-à-esquerda" e "abaixo-à-direita" do ponto: o texto não cai em cima da linha tracejada.
    // Pontos colados na borda de baixo escrevem para dentro do gráfico (acima do ponto), os da borda de cima abaixo.
    let position = rank % 2 === 0 ? "bottom right" : "top left";
    if (nearTop(r.accuracy) && !nearBottom(r.accuracy)) position = "bottom right";
    else if (nearBottom(r.accuracy)) position = rank % 2 === 0 ? "top right" : "top left";
    labels.set(r, { text, position });
  });
  return labels;
}

export function buildCellTraces(cell, xRef, yRef, colorMap, markerMap, shownModels, paretoLegendShown, yLim = null) {
  const traces = [];

  if (cell.length === 0) return traces; // célula vazia -> layout cuida da anotação "Sem dados"

  const labels = computeCellLabels(cell, yLim);

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
      text: rows.map((r) => labels.get(r).text),
      textposition: rows.map((r) => labels.get(r).position),
      customdata: rows.map((r) => r.experimento_id),
      textfont: { size: 10, color: "#6b7280" },
      cliponaxis: false, // rótulo do ponto perto da borda não é cortado ("exp-")
      marker: { color: colorMap[modelo], symbol: markerMap[modelo], size: 12 },
      name: modelo,
      legendgroup: modelo,
      showlegend: !alreadyShown,
      xaxis: xRef,
      yaxis: yRef,
      hovertemplate: `<b>${modelo}</b><br>%{customdata}<br>Accuracy: %{y:.3f}<br>Tempo: %{x:.1f} ms<extra></extra>`,
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

// ---------------------------------------------------------------------------
// Geometria em PIXELS do grid do Pareto (corrige sobreposição de texto).
//
// Antes: gapY = 0.1 e legenda em y = -0.22 eram FRAÇÕES da altura/largura,
// então o espaço entre linhas não crescia com a fonte dos ticks nem com o nº
// de linhas do título do painel — ticks do eixo X da linha de cima colidiam
// com o título da linha de baixo, e a legenda invadia o título do eixo X.
// Aqui cada faixa vertical é dimensionada em px e só depois convertida em
// fração, usando a largura real em que a figura será desenhada.
// ---------------------------------------------------------------------------
export const PARETO_TICK_PX = 22;     // altura de uma linha de tick (fonte 16)
export const PARETO_TITLE_LINE_PX = 21; // linha de título de painel (fonte 16 bold)

/**
 * @param {{nRows:number, nCols:number, width:number, legendNames:string[], cellTitleMaxLines?:number, figTitleLines?:number}} p
 * @returns layout parcial {height, margin, legend}, mais frações p/ montar domínios e anotações
 */
export function paretoGeometry({ nRows, nCols, width, legendNames, cellTitleMaxLines = 1, cellHeightPx = 280 }) {
  const lPx = 100, rPx = 40;
  const A = width - lPx - rPx; // largura da área de plotagem

  // legenda horizontal: estima nº de linhas pelo texto real (fonte 20)
  const legendFont = 20;
  const items = [...legendNames, "Pareto Frontier"];
  const itemPx = items.map((n) => 44 + Math.ceil(n.length * legendFont * 0.6) + 16); // símbolo + texto + espaço
  let legendRows = 1, rowW = 0;
  for (const w of itemPx) {
    if (rowW + w > width - 80 && rowW > 0) { legendRows++; rowW = w; } else rowW += w;
  }
  const legendPx = legendRows * Math.round(legendFont * 1.5) + 16;

  const titlePx = cellTitleMaxLines * PARETO_TITLE_LINE_PX + 10;     // título de painel + respiro
  const gapYPx = PARETO_TICK_PX + titlePx + 44;                       // ticks da linha de cima + título da de baixo + folga p/ marcador/rótulo de ponto na borda
  const gapXPx = 44;                                                  // entre colunas (ticks X podem sair ~metade da largura)
  const tPx = 70 + titlePx;                                           // título da figura (fonte 22) + título da 1ª linha
  const bPx = PARETO_TICK_PX + 34 /* título do eixo X */ + 20 + legendPx + 12;

  const plotH = nRows * cellHeightPx + (nRows - 1) * gapYPx;
  const gapXf = nCols > 1 ? gapXPx / A : 0;
  const colW = (1 - gapXf * (nCols - 1)) / nCols;
  const rowH = cellHeightPx / plotH;
  const gapYf = nRows > 1 ? gapYPx / plotH : 0;

  return {
    height: tPx + bPx + plotH,
    margin: { t: tPx, b: bPx, l: lPx, r: rPx },
    legend: { font: { size: legendFont }, orientation: "h", x: 0.5, xanchor: "center", y: 0, yref: "container", yanchor: "bottom" },
    colWidthPx: colW * A,
    colW, rowH, gapXf, gapYf,
  };
}

/** Quantas linhas um título de painel ocupa dado o espaço (px) da coluna (fonte 16 bold ≈ 11px/char). */
export function titleMaxChars(colPx) {
  return Math.max(12, Math.floor(colPx / 11));
}

/** Eixo X log com limites que deixam o rótulo do ponto (texto) caber, e ticks 1-2-5 em vez de 2,3,4…9. */
export function logXAxisRange(cell) {
  const xs = cell.map((r) => r.mean_inference_time).filter((v) => v != null && v > 0);
  if (xs.length === 0) return undefined;
  return [Math.log10(Math.min(...xs) / 1.35), Math.log10(Math.max(...xs) * 1.45)];
}

/**
 * Formato do tick de acurácia conforme a faixa visível: com poucos pontos próximos (ex: 13.3%–14.7%)
 * o ",.0%" fixo gerava ticks repetidos ("14% 14% 14% 13%").
 */
export function accuracyTickFormat(yLim) {
  const span = yLim[1] - yLim[0];
  if (span >= 0.06) return ",.0%";
  if (span >= 0.006) return ",.1%";
  return ",.2%";
}
