// components/plotBuilders/chartPareto.js
//
// Replica chart_pareto.py generate(): grade única — linhas = TODOS os
// datasets presentes em pareto_df (mesmo os sem nenhum ponto válido),
// colunas = UNIÃO de todos os devices com mean_inference_time válido
// (`sorted(valid["device"].dropna().unique())`). Eixo X log, escala de Y
// compartilhada por linha (dataset), célula sem dados mostra "Sem dados".

import { buildModelColorMarkerMaps, computeRowYLim, buildCellTraces, emptyCellAnnotation } from "./paretoGrid.js";

/**
 * @param {import('../../lib/types').ParetoRow[]} paretoRows - saída de buildParetoDataset() (já achatada, não por dataset)
 * @returns {{data: object[], layout: object}}
 */
export function buildChartParetoPlot(paretoRows) {
  const valid = paretoRows.filter((r) => r.mean_inference_time != null);
  const datasets = [...new Set(paretoRows.map((r) => r.dataset))];
  const devices = [...new Set(valid.map((r) => r.device))].sort();

  const { colorMap, markerMap } = buildModelColorMarkerMaps(paretoRows);

  const nRows = datasets.length;
  const nCols = devices.length;
  const gapX = nCols > 1 ? 0.05 : 0;
  const gapY = nRows > 1 ? 0.1 : 0;
  const colWidth = (1 - gapX * (nCols - 1)) / nCols;
  const rowHeight = (1 - gapY * (nRows - 1)) / nRows;

  const data = [];
  const layout = {
    title: "Accuracy vs. Inference Time with Pareto Frontier",
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    annotations: [],
  };

  const shownModels = new Set();
  const paretoLegendShown = { shown: false };

  datasets.forEach((dataset, rowIdx) => {
    const rowData = valid.filter((r) => r.dataset === dataset);
    const yLim = computeRowYLim(rowData);
    // topo da figura = primeiro dataset (mesma ordem visual do plt.subplots por linha)
    const yStart = 1 - (rowIdx + 1) * rowHeight - rowIdx * gapY;

    devices.forEach((device, colIdx) => {
      const axisIdx = rowIdx * nCols + colIdx;
      const axisSuffix = axisIdx === 0 ? "" : axisIdx + 1;
      const xRef = `x${axisSuffix}`;
      const yRef = `y${axisSuffix}`;
      const xStart = colIdx * (colWidth + gapX);
      const xDomain = [xStart, xStart + colWidth];
      const yDomain = [yStart, yStart + rowHeight];

      layout[`xaxis${axisSuffix}`] = {
        domain: xDomain,
        anchor: yRef,
        type: "log",
        title: rowIdx === nRows - 1 ? "Inference Time (ms)" : "",
      };
      layout[`yaxis${axisSuffix}`] = {
        domain: yDomain,
        anchor: xRef,
        range: yLim,
        title: colIdx === 0 ? "Accuracy" : "",
        gridcolor: "#e5e7eb",
      };

      const cell = rowData.filter((r) => r.device === device);
      data.push(...buildCellTraces(cell, xRef, yRef, colorMap, markerMap, shownModels, paretoLegendShown));

      if (cell.length === 0) {
        layout.annotations.push(emptyCellAnnotation(xDomain, yDomain));
      }

      layout.annotations.push({
        text: `<b>${dataset} — ${device}</b>`,
        showarrow: false,
        x: xStart + colWidth / 2,
        xref: "paper",
        y: yStart + rowHeight + 0.02,
        yref: "paper",
        font: { size: 11 },
      });
    });
  });

  return { data, layout };
}
