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

// DEPOIS
import { buildModelColorMarkerMaps, computeRowYLim, buildCellTraces, emptyCellAnnotation } from "./paretoGrid.js";
import { PREDICTION_LEGEND_FONT_SIZE } from "../chartTheme.js";

/**
 * @param {Record<string, import('../../lib/types').ParetoRow[]>} paretoByDataset - já particionado por dataset (results.chart_pareto_by_dataset do store)
 * @returns {Record<string, {data: object[], layout: object}>}
 */
export function buildChartParetoByDatasetPlots(paretoByDataset) {
  const allRows = Object.values(paretoByDataset).flat();
  const { colorMap, markerMap } = buildModelColorMarkerMaps(allRows);

  const figures = {};

  for (const [dataset, rows] of Object.entries(paretoByDataset)) {
    const valid = rows.filter((r) => r.mean_inference_time != null);
    if (valid.length === 0) continue; // dataset sem nenhum dado válido de inferência não gera figura (igual ao original)

    const devices = [...new Set(valid.map((r) => r.device))].sort();
    const yLim = computeRowYLim(valid);

    const gapX = devices.length > 1 ? 0.06 : 0;
    const colWidth = (1 - gapX * (devices.length - 1)) / devices.length;

    const data = [];
    const layout = {
      title: `Accuracy vs. Inference Time for ${dataset} Dataset`,
      plot_bgcolor: "#ffffff",
      paper_bgcolor: "#ffffff",
      legend: { font: { size: PREDICTION_LEGEND_FONT_SIZE } },
      annotations: [],
    };

    const shownModels = new Set();
    const paretoLegendShown = { shown: false };

    devices.forEach((device, colIdx) => {
      const axisSuffix = colIdx === 0 ? "" : colIdx + 1;
      const xRef = `x${axisSuffix}`;
      const yRef = `y${axisSuffix}`;
      const xStart = colIdx * (colWidth + gapX);
      const xDomain = [xStart, xStart + colWidth];

      layout[`xaxis${axisSuffix}`] = { domain: xDomain, type: "log", title: "Inference Time (ms)" };
      layout[`yaxis${axisSuffix}`] = { range: yLim, title: colIdx === 0 ? "Accuracy" : "", gridcolor: "#e5e7eb" };

      const cell = valid.filter((r) => r.device === device);
      data.push(...buildCellTraces(cell, xRef, yRef, colorMap, markerMap, shownModels, paretoLegendShown));

      if (cell.length === 0) {
        layout.annotations.push(emptyCellAnnotation(xDomain, [0, 1]));
      }

      layout.annotations.push({
        text: `<b>${device}</b>`,
        showarrow: false,
        x: xStart + colWidth / 2,
        xref: "paper",
        y: 1.06,
        yref: "paper",
        font: { size: 11 },
      });
    });

    figures[dataset] = { data, layout };
  }

  return figures;
}
