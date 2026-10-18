import { TAB10, AXIS_STYLE, axisTitle, legendBlockPx, legendFontFor, figureTitle, panelHeading } from "../chartTheme.js";
import { buildGroupLabel } from "../../lib/statsUtils.js";

function globalModelOrder(rows) {
  const sums = new Map();
  const counts = new Map();
  for (const r of rows) {
    sums.set(r.modelo, (sums.get(r.modelo) ?? 0) + r.mean);
    counts.set(r.modelo, (counts.get(r.modelo) ?? 0) + 1);
  }
  return [...sums.keys()].sort((a, b) => sums.get(a) / counts.get(a) - sums.get(b) / counts.get(b));
}

/**
 * @param {import('../../lib/types').GroupCIStats[]} chart3Stats - mean/ci_lower/ci_upper de inference_time
 * @returns {{data: object[], layout: object}}
 */
export function buildChart3Plot(chart3Stats, { width = 1400 } = {}) {
  const devices = [...new Set(chart3Stats.map((r) => r.device))].sort();
  const modelOrder = globalModelOrder(chart3Stats); // uma vez só, sobre TODA a tabela

  const allGroups = [...new Set(chart3Stats.map((r) => buildGroupLabel(r.dataset, r.experimento_id)))].sort();
  const legendFont = legendFontFor(allGroups.length, 20);
  const legendBlock = legendBlockPx(allGroups, { fontSize: legendFont, width });
  const longestModel = Math.max(...modelOrder.map((m) => String(m).length), 1);
  const tickBlockPx = Math.round(longestModel * 16 * 0.6 * 0.72) + 14; // ticks rotacionados -45°
  const shownGroups = new Set();

  const nCols = devices.length;
  const gap = 0.06;
  const domainWidth = (1 - gap * (nCols - 1)) / nCols;

  const data = [];
  const layout = {
    title: figureTitle("Tempo de Inferência por Modelo, Device e Experimento"),
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    barmode: "group",
    grid: { rows: 1, columns: nCols, pattern: "independent" },
    showlegend: true,
    legend: { font: { size: legendFont }, orientation: "h", x: 0.5, xanchor: "center", y: 0, yref: "container", yanchor: "bottom" },
    margin: { t: 130, b: tickBlockPx + 34 + legendBlock.heightPx + 24, l: 90, r: 40 },
    // altura em px: área de plotagem mínima de 380px mesmo com legenda de várias linhas (senão as barras ficam achatadas)
    height: 130 + (tickBlockPx + 34 + legendBlock.heightPx + 24) + 380,
    annotations: [],
  };

  devices.forEach((device, i) => {
    const axisSuffix = i === 0 ? "" : i + 1;
    const domainStart = i * (domainWidth + gap);

    layout[`xaxis${axisSuffix}`] = { domain: [domainStart, domainStart + domainWidth], title: { ...axisTitle("Modelo"), standoff: 8 }, tickangle: -45, tickfont: AXIS_STYLE, automargin: true };
    layout[`yaxis${axisSuffix}`] = { title: axisTitle(i === 0 ? "Tempo de Inferência (ms)" : ""), gridcolor: "#e5e7eb", tickfont: AXIS_STYLE, automargin: true };

    const rowsForDevice = chart3Stats.filter((r) => r.device === device);
    const grupos = [...new Set(rowsForDevice.map((r) => buildGroupLabel(r.dataset, r.experimento_id)))].sort();

    grupos.forEach((grupo, gi) => {
      const rowsForGrupo = rowsForDevice.filter((r) => buildGroupLabel(r.dataset, r.experimento_id) === grupo);
      const byModel = new Map(rowsForGrupo.map((r) => [r.modelo, r]));

      const xs = [], ys = [], errPlus = [], errMinus = [];
      modelOrder.forEach((modelo) => {
        const r = byModel.get(modelo);
        if (!r) return;
        xs.push(modelo);
        ys.push(r.mean);
        errPlus.push(r.ci_upper - r.mean);
        errMinus.push(r.mean - r.ci_lower);
      });

      data.push({
        type: "bar",
        name: grupo,
        x: xs,
        y: ys,
        error_y: { type: "data", array: errPlus, arrayminus: errMinus, visible: true },
        marker: { color: TAB10[gi % TAB10.length] },
        xaxis: `x${axisSuffix}`,
        yaxis: `y${axisSuffix}`,
        legendgroup: grupo,
        showlegend: !shownGroups.has(grupo),
        hovertemplate: `<b>${grupo}</b><br>%{x}<br>Média: %{y:.2f} ms<extra></extra>`,
      });
      shownGroups.add(grupo);
    });

    layout.annotations.push(panelHeading(device, domainStart + domainWidth / 2, 20));
  });

  return { data, layout };
}
