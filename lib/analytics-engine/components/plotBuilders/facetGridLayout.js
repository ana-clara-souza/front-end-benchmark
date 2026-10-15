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

/** Anotação de título de painel centralizada acima do domínio — equivalente ao ax.set_title() por subplot. */
export function panelTitleAnnotation(text, domainStart, domainWidth, y = 1.06) {
  return {
    text: `<b>${text}</b>`,
    showarrow: false,
    x: domainStart + domainWidth / 2,
    xref: "paper",
    y,
    yref: "paper",
    yanchor: "bottom", // cresce pra cima se o título quebrar em 2 linhas, sem colidir com o gráfico
    font: { size: 18 },
  };
}
