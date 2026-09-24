// components/plotBuilders/chart1.js
//
// IMPORTANTE: usamos o modo "estatísticas pré-computadas" do trace `box`
// do Plotly (passar q1/median/q3/lowerfence/upperfence diretamente) em vez
// de passar os valores brutos de pss_peak e deixar o Plotly calcular os
// quartis sozinho. Isso é proposital: o Plotly usa por padrão um método de
// interpolação de quartil que pode não bater exatamente com o
// `values.quantile([0.25,0.5,0.75])` do pandas (que statsMobile.js já
// replica fielmente, validado contra golden file). Usar as estatísticas
// pré-computadas garante que o desenho do boxplot mostra EXATAMENTE os
// números de computeChart1Stats(), não uma segunda versão recalculada
// pelo Plotly que poderia divergir na segunda casa decimal.
//
// Outliers não fazem parte do modo pré-computado do Plotly (que não vê os
// pontos brutos) — são desenhados como uma trace de scatter separada,
// usando a lista `outliers` que computeChart1Stats() já calculou.

import { TAB10, AXIS_STYLE } from "../chartTheme.js";

/**
 * @param {import('../../lib/types').Chart1Stats[]} chart1Stats
 * @returns {{data: object[], layout: object}}
 */
export function buildChart1Plot(chart1Stats) {
  const datasets = chart1Stats.map((r) => r.dataset);

  const boxTrace = {
    type: "box",
    x: datasets,
    q1: chart1Stats.map((r) => r.q1),
    median: chart1Stats.map((r) => r.median),
    q3: chart1Stats.map((r) => r.q3),
    lowerfence: chart1Stats.map((r) => r.whisker_low),
    upperfence: chart1Stats.map((r) => r.whisker_high),
    mean: chart1Stats.map((r) => r.mean),
    sd: chart1Stats.map((r) => r.std ?? 0),
    boxmean: false, // já mostramos a mediana pela caixa; média fica disponível via hover custom abaixo
    marker: { color: TAB10[0] },
    name: "PSS Peak",
    hovertemplate:
      "<b>%{x}</b><br>Mediana: %{median}<br>Q1: %{q1}<br>Q3: %{q3}<br>Whisker inferior: %{lowerfence}<br>Whisker superior: %{upperfence}<extra></extra>",
  };

  // Outliers: uma trace de scatter por cima, na mesma categoria x, com os
  // pontos que computeChart1Stats() já identificou fora do whisker.
  const outlierX = [];
  const outlierY = [];
  chart1Stats.forEach((r) => {
    r.outliers.forEach((v) => {
      outlierX.push(r.dataset);
      outlierY.push(v);
    });
  });

  const outlierTrace = {
    type: "scatter",
    mode: "markers",
    x: outlierX,
    y: outlierY,
    marker: { color: TAB10[3], size: 6, symbol: "circle-open" },
    name: "Outliers",
    hovertemplate: "<b>%{x}</b><br>Outlier: %{y}<extra></extra>",
  };

  const layout = {
    title: { text: "PSS Peak by Dataset", font: { size: 18 } },
    xaxis: { title: "Dataset", tickfont: AXIS_STYLE, titlefont: AXIS_STYLE },
    yaxis: { title: "PSS Peak (MB)", gridcolor: "#e5e7eb", tickfont: AXIS_STYLE, titlefont: AXIS_STYLE },
    showlegend: false,
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    margin: { t: 70, b: 50, l: 60, r: 30 },
  };

  return { data: [boxTrace, outlierTrace], layout };
}
