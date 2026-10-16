// components/plotBuilders/chartParetoByDataset.js
//
// Replica chart_pareto.py generate_by_dataset(): uma FIGURA SEPARADA por
// dataset (não um grid combinado) — grade 1×devices, usando só os devices
// presentes NAQUELE dataset (não a união global usada em chart_pareto.js).
// Cor/marcador por modelo são derivados de TODAS as linhas recebidas
// (todos os datasets juntos, antes de particionar), pra bater exatamente
// com chart_pareto.js quando os dois forem pedidos na mesma mensagem.
//
// Builder "multi": em vez de devolver um único {data, layout}, devolve um
// dict {dataset: {data, layout}} — chartRegistry.js trata isso como N
// slots (um card por dataset), não um só.

import { buildModelColorMarkerMaps, computeRowYLim, buildCellTraces, paretoGeometry, titleMaxChars, logXAxisRange, accuracyTickFormat } from "./paretoGrid.js";
import { AXIS_STYLE, axisTitle } from "../chartTheme.js";
import { wrapPlain } from "./facetGridLayout.js";

/**
 * @param {Record<string, import('../../lib/types').ParetoRow[]>} paretoByDataset - já particionado por dataset (results.chart_pareto_by_dataset do store)
 * @param {{width?: number}} [opts] - largura (px) em que as figuras vão ser desenhadas (o modal mede e re-chama); default 1400
 * @returns {Record<string, {data: object[], layout: object}>}
 */
export function buildChartParetoByDatasetPlots(paretoByDataset, { width = 1400 } = {}) {
  const allRows = Object.values(paretoByDataset).flat();
  const { colorMap, markerMap, models } = buildModelColorMarkerMaps(allRows);

  const figures = {};

  for (const [dataset, rows] of Object.entries(paretoByDataset)) {
    const valid = rows.filter((r) => r.mean_inference_time != null);
    if (valid.length === 0) continue; // dataset sem nenhum dado válido de inferência não gera figura (igual ao original)

    const devices = [...new Set(valid.map((r) => r.device))].sort();
    const yLim = computeRowYLim(valid);

    const nCols = devices.length;
    const probe = paretoGeometry({ nRows: 1, nCols, width, legendNames: models });
    const maxChars = titleMaxChars(probe.colWidthPx);
    const titleLines = Math.max(...devices.map((dev) => wrapPlain(dev, maxChars).split("<br>").length));
    const geo = paretoGeometry({ nRows: 1, nCols, width, legendNames: models, cellTitleMaxLines: titleLines });

    const data = [];
    const layout = {
      title: { text: `Accuracy vs. Inference Time for ${dataset} Dataset`, font: { size: 22 } },
      plot_bgcolor: "#ffffff",
      paper_bgcolor: "#ffffff",
      legend: geo.legend,
      annotations: [],
      margin: geo.margin,
      height: geo.height,
    };

    const shownModels = new Set();
    const paretoLegendShown = { shown: false };

    devices.forEach((device, colIdx) => {
      const axisSuffix = colIdx === 0 ? "" : colIdx + 1;
      const xRef = `x${axisSuffix}`;
      const yRef = `y${axisSuffix}`;
      const xStart = colIdx * (geo.colW + geo.gapXf);
      const xDomain = [xStart, xStart + geo.colW];
      const cell = valid.filter((r) => r.device === device);

      layout[`xaxis${axisSuffix}`] = {
        domain: xDomain,
        type: "log",
        range: logXAxisRange(cell),
        dtick: "D2",
        tickformat: ",.0f",
        title: axisTitle("Inference Time (ms)"),
        tickfont: AXIS_STYLE,
      };
      layout[`yaxis${axisSuffix}`] = {
        range: yLim,
        title: axisTitle(colIdx === 0 ? "Accuracy (%)" : ""),
        tickformat: accuracyTickFormat(yLim),
        gridcolor: "#e5e7eb",
        tickfont: AXIS_STYLE,
        showticklabels: colIdx === 0, // mesma faixa Y entre devices; rótulos da 2ª+ colunas colidiam com o painel vizinho
      };

      data.push(...buildCellTraces(cell, xRef, yRef, colorMap, markerMap, shownModels, paretoLegendShown));

      layout.annotations.push({
        text: `<b>${wrapPlain(device, maxChars)}</b>`,
        xanchor: "center", // sem isso o Plotly usa anchor "auto" e desloca o título p/ a esquerda/direita conforme a posição
    yanchor: "bottom",
        showarrow: false,
        x: xStart + geo.colW / 2,
        xref: "paper",
        y: 1,
        yref: "paper",
        yshift: 6,
        font: { size: 16 },
      });
    });

    figures[dataset] = { data, layout };
  }

  return figures;
}
