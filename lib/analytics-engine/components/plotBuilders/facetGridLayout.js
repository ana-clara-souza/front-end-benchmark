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

/** Anotação de título de painel centralizada acima do domínio — equivalente ao ax.set_title() por subplot. */
export function panelTitleAnnotation(text, domainStart, domainWidth, y = 1.06) {
  return {
    text: `<b>${text}</b>`,
    showarrow: false,
    x: domainStart + domainWidth / 2,
    xref: "paper",
    y,
    yref: "paper",
    font: { size: 13 },
  };
}
