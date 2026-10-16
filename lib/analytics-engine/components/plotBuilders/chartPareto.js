import { buildModelColorMarkerMaps, computeRowYLim, buildCellTraces, paretoGeometry, titleMaxChars, logXAxisRange, accuracyTickFormat } from "./paretoGrid.js";
import { AXIS_STYLE, axisTitle } from "../chartTheme.js";
import { wrapPlain } from "./facetGridLayout.js";

/**
 * @param {import('../../lib/types').ParetoRow[]} paretoRows - saída de buildParetoDataset() (já achatada, não por dataset)
 * @param {{width?: number}} [opts] - largura (px) em que a figura vai ser desenhada (o modal mede e re-chama); default 1400
 * @returns {{data: object[], layout: object}}
 */
export function buildChartParetoPlot(paretoRows, { width = 1400 } = {}) {
  const valid = paretoRows.filter((r) => r.mean_inference_time != null);
  const datasets = [...new Set(paretoRows.map((r) => r.dataset))];
  const devices = [...new Set(valid.map((r) => r.device))].sort();

  const { colorMap, markerMap, models } = buildModelColorMarkerMaps(paretoRows);

  const nRows = datasets.length;
  const nCols = devices.length;

  // 1ª passada: nº de linhas do título de painel (depende da largura da coluna)
  const probe = paretoGeometry({ nRows, nCols, width, legendNames: models });
  const maxChars = titleMaxChars(probe.colWidthPx);
  const titleOf = (dataset, device) => wrapPlain(`${dataset} — ${device}`, maxChars);
  const titleLines = Math.max(1, ...datasets.flatMap((d) => devices.map((dev) => titleOf(d, dev).split("<br>").length)));
  const geo = paretoGeometry({ nRows, nCols, width, legendNames: models, cellTitleMaxLines: titleLines });

  const data = [];
  const layout = {
    title: { text: "Accuracy vs. Inference Time with Pareto Frontier", font: { size: 22 } },
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    legend: geo.legend,
    annotations: [],
    margin: geo.margin,
    height: geo.height,
  };

  const shownModels = new Set();
  const paretoLegendShown = { shown: false };

  datasets.forEach((dataset, rowIdx) => {
    const rowData = valid.filter((r) => r.dataset === dataset);
    const yLim = computeRowYLim(rowData);
    // 1ª coluna que tem dados nesta linha: é nela que ficam os rótulos/título do eixo Y
    // (cada dataset pode ter só alguns devices; se a coluna 0 está vazia, a linha ficava sem escala)
    const firstColWithData = Math.max(0, devices.findIndex((dev) => rowData.some((r) => r.device === dev)));
    // topo da figura = primeiro dataset (mesma ordem visual do plt.subplots por linha)
    const yTop = 1 - rowIdx * (geo.rowH + geo.gapYf);
    const yStart = yTop - geo.rowH;

    devices.forEach((device, colIdx) => {
      const axisIdx = rowIdx * nCols + colIdx;
      const axisSuffix = axisIdx === 0 ? "" : axisIdx + 1;
      const xRef = `x${axisSuffix}`;
      const yRef = `y${axisSuffix}`;
      const xStart = colIdx * (geo.colW + geo.gapXf);
      const xDomain = [xStart, xStart + geo.colW];
      const yDomain = [yStart, yTop];
      const cell = rowData.filter((r) => r.device === device);

      layout[`xaxis${axisSuffix}`] = {
        domain: xDomain,
        anchor: yRef,
        type: "log",
        range: logXAxisRange(cell),
        dtick: "D2", // ticks 1-2-5 por década (o log "cheio" 2,3,4…9 vira ruído e vaza p/ o título abaixo)
        tickformat: ",.0f",
        title: axisTitle(rowIdx === nRows - 1 ? "Inference Time (ms)" : ""),
        tickfont: AXIS_STYLE,
      };
      layout[`yaxis${axisSuffix}`] = {
        domain: yDomain,
        anchor: xRef,
        range: yLim,
        title: {
          ...axisTitle(colIdx === firstColWithData ? "Accuracy (%)" : ""),
          // eixo numa coluna interna: automargin não age, então afasta o título dos rótulos (~7 chars em fonte 16) à mão
          ...(colIdx > 0 && colIdx === firstColWithData ? { standoff: 62 } : {}),
        },
        tickformat: accuracyTickFormat(yLim),
        gridcolor: "#e5e7eb",
        tickfont: AXIS_STYLE,
        // mesma faixa Y para todos os devices da linha: só a 1ª coluna precisa de rótulos
        // (os da 2ª+ ficavam dentro do gap e colidiam com o painel vizinho)
        showticklabels: colIdx === firstColWithData,
        automargin: true, // afasta o título do eixo dos rótulos (também quando o eixo cai numa coluna interna)
      };

      data.push(...buildCellTraces(cell, xRef, yRef, colorMap, markerMap, shownModels, paretoLegendShown));

      layout.annotations.push({
        text: `<b>${titleOf(dataset, device)}</b>`,
        xanchor: "center", // sem isso o Plotly usa anchor "auto" e desloca o título p/ a esquerda/direita conforme a posição
    yanchor: "bottom",
        showarrow: false,
        x: xStart + geo.colW / 2,
        xref: "paper",
        y: yTop,
        yref: "paper",
        yshift: 6, // px acima do topo do painel (não depende da altura da figura)
        font: { size: 16 },
      });
    });
  });

  return { data, layout };
}
