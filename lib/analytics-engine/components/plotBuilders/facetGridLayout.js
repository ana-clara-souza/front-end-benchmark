// components/plotBuilders/facetGridLayout.js
//
// Cálculo de domínios de subplot em grid 1×N (um painel por dataset/device),
// equivalente ao que `standard_figsize(n_cols, 1)` + `plt.subplots(1, n)`
// davam de graça no matplotlib. Plotly não tem "facet" nativo, então cada
// painel vira um par xaxis/yaxis com domínio próprio dentro do layout.
//
// chart2.js/chart3.js/chart4.js têm essa mesma matemática inline (já
// testados contra golden file antes deste helper existir) — não foram
// refatorados pra usar isso por precaução de não arriscar regressão em
// código que já estava validado. chartMetrics.js e chartF1Heatmap.js usam
// este helper de fato (refatorado e revalidado contra a suíte completa).

/**
 * @param {number} n - número de painéis (datasets/devices)
 * @param {number} [gap=0.06] - espaço entre painéis, em fração de largura total (0-1)
 * @returns {Array<{axisSuffix: string|number, xKey: string, yKey: string, xRef: string, yRef: string, domainStart: number, domainWidth: number}>}
 */
export function computeFacetDomains(n, gap = 0.06) {
  const domainWidth = (1 - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => {
    const axisSuffix = i === 0 ? "" : i + 1;
    const domainStart = i * (domainWidth + gap);
    return {
      axisSuffix,
      xKey: `xaxis${axisSuffix}`,
      yKey: `yaxis${axisSuffix}`,
      xRef: `x${axisSuffix}`,
      yRef: `y${axisSuffix}`,
      domainStart,
      domainWidth,
    };
  });
}

/**
 * Gap entre painéis proporcional ao rótulo mais largo do eixo Y: os ticks do
 * painel N+1 são desenhados DENTRO do gap, à esquerda do painel (o Plotly não
 * reserva esse espaço sozinho), por isso gap fixo de 0.08 faz o texto invadir
 * o painel vizinho quando o rótulo é "modelo (experimento)".
 * Estimativa: ~0.55 * fontSize px por caractere, largura de referência 1400px.
 */
export function computeGapForLabels(labels, fontSize = 16, refWidthPx = 1400, min = 0.08, max = 0.3) {
  const longestLine = Math.max(
    0,
    ...labels.flatMap((l) => String(l).split("<br>").map((line) => line.length))
  );
  return Math.min(max, Math.max(min, (longestLine * fontSize * 0.55) / refWidthPx + 0.02));
}

/**
 * Anotação de título de painel centralizada acima do domínio — equivalente ao ax.set_title() por subplot.
 * `maxChars` quebra o título em linhas (<br>) para não invadir o título do painel vizinho; a posição vertical
 * usa `yshift` em px (não fração), então não depende da altura da figura.
 */
export function panelTitleAnnotation(text, domainStart, domainWidth, y = 1, { maxChars = null, yshift = 8 } = {}) {
  const wrapped = maxChars ? wrapPlain(text, maxChars) : text;
  return {
    text: `<b>${wrapped}</b>`,
    showarrow: false,
    x: domainStart + domainWidth / 2,
    xref: "paper",
    y,
    yref: "paper",
    yshift,
    xanchor: "center", // sem isso o Plotly usa anchor "auto" e desloca o título p/ a esquerda/direita conforme a posição
    yanchor: "bottom", // cresce pra cima se o título quebrar em 2 linhas, sem colidir com o gráfico
    font: { size: 18 },
  };
}

/** Quebra nos espaços em linhas de até maxChars caracteres (<br>). */
export function wrapPlain(text, maxChars) {
  const lines = [];
  let cur = "";
  for (const w of String(text).split(" ")) {
    if (cur && (cur + " " + w).length > maxChars) { lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lines.join("<br>");
}

// ---------------------------------------------------------------------------
// Layout em PIXELS (corrige sobreposição de texto no modal e no PNG/PDF)
//
// O Plotly só aceita `domain` em fração (0-1) da área de plotagem, mas o
// tamanho do texto (ticks, títulos, legenda) é em px. Quando o gap entre
// painéis era uma fração fixa (calculada para uma largura "de referência"
// de 1400px), qualquer largura menor — o modal tem ~1000px — fazia os
// rótulos do painel N+1 (desenhados DENTRO do gap) invadirem o painel N, e
// os títulos de painel (centralizados, sem limite de largura) colidirem
// entre si. Aqui o gap é calculado em px a partir do texto real e só então
// convertido em fração, usando a largura REAL em que a figura será desenhada
// (`width`) — o modal re-chama o builder com a largura medida.
// ---------------------------------------------------------------------------

/** Largura média de um caractere (fração do fontSize), conservadora p/ fontes sans-serif do Plotly. */
const CHAR_W = 0.6;
const CHAR_W_BOLD = 0.68;

/** Largura estimada (px) da linha mais larga de um texto, considerando <br>. */
export function estimateTextWidthPx(text, fontSize, bold = false) {
  const k = bold ? CHAR_W_BOLD : CHAR_W;
  return Math.ceil(Math.max(0, ...String(text).split("<br>").map((l) => l.length)) * fontSize * k);
}

/** Largura estimada (px) do rótulo mais largo de uma lista. */
export function longestLabelPx(labels, fontSize) {
  return Math.max(0, ...labels.map((l) => estimateTextWidthPx(l, fontSize)));
}

/**
 * Distribui N painéis lado a lado (heatmaps) garantindo que o rótulo do eixo Y
 * de cada painel caiba no espaço À ESQUERDA dele sem tocar o painel anterior.
 * Reduz a fonte dos ticks (fontMax -> fontMin) se necessário; se mesmo assim
 * não couber, AUMENTA a largura da figura (o modal passa a rolar na
 * horizontal) em vez de deixar o texto se sobrepor.
 *
 * @param {object} p
 * @param {string[][]} p.labelsByPanel - rótulos do eixo Y de cada painel (com <br>)
 * @param {number} p.nCols - colunas por painel (para largura mínima de célula)
 * @param {number} p.minCellPx - largura mínima de uma célula do heatmap
 * @param {number} p.width - largura total desejada da figura (px)
 * @param {number} [p.rightMargin=130] - reservado p/ colorbar
 */
export function fitHeatmapFacets({ labelsByPanel, nCols, minCellPx, width = 1400, rightMargin = 130, fontMax = 16, fontMin = 12, pad = 28, leftPad = 14 }) {
  const n = labelsByPanel.length;
  const solve = (fs, W) => {
    const labelW = labelsByPanel.map((ls) => longestLabelPx(ls, fs) + 8); // +8: tick + respiro
    const l = labelW[0] + leftPad;
    const area = W - l - rightMargin;
    const gaps = labelW.slice(1).map((w) => w + pad);
    const plotW = (area - gaps.reduce((a, b) => a + b, 0)) / n;
    return { fs, labelW, l, area, gaps, plotW };
  };

  let sol = null;
  let W = width;
  for (let fs = fontMax; fs >= fontMin; fs--) {
    const s = solve(fs, W);
    if (s.plotW >= nCols * minCellPx) { sol = s; break; }
  }
  if (!sol) {
    const s = solve(fontMin, W);
    // largura necessária para o mínimo de célula caber
    W = Math.ceil(s.l + rightMargin + s.gaps.reduce((a, b) => a + b, 0) + n * nCols * minCellPx);
    sol = solve(fontMin, W);
  }

  const domains = [];
  let x0 = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) x0 += sol.plotW + sol.gaps[i - 1];
    domains.push([x0 / sol.area, Math.min(1, (x0 + sol.plotW) / sol.area)]);
  }
  return { width: W, tickFontSize: sol.fs, margin: { l: sol.l, r: rightMargin }, domains, plotWidthPx: sol.plotW };
}
