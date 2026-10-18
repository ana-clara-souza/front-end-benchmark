import { colorForGroup, AXIS_STYLE, axisTitle, legendBlockPx, legendFontFor, figureTitle, panelHeading } from "../chartTheme.js";
import { buildGroupLabel } from "../../lib/statsUtils.js";

function globalModelOrderByImpliedTime(rows) {
  const sums = new Map();
  const counts = new Map();
  for (const r of rows) {
    const impliedTime = 1000 / r.ips_mean; // desfaz o `ips_mean = round(1000/mean, 2)`
    sums.set(r.modelo, (sums.get(r.modelo) ?? 0) + impliedTime);
    counts.set(r.modelo, (counts.get(r.modelo) ?? 0) + 1);
  }
  return [...sums.keys()].sort((a, b) => sums.get(a) / counts.get(a) - sums.get(b) / counts.get(b));
}

/**
 * @param {import('../../lib/types').IpsStats[]} chart4Stats
 * @returns {{data: object[], layout: object}}
 */
export function buildChart4Plot(chart4Stats, { width = 1400 } = {}) {
  const devices = [...new Set(chart4Stats.map((r) => r.device))].sort();
  const modelOrder = globalModelOrderByImpliedTime(chart4Stats);

  const allGroups = [...new Set(chart4Stats.map((r) => buildGroupLabel(r.dataset, r.experimento_id)))].sort();
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
    title: figureTitle("IPS (inferences per second) by model, device and experiment"),
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    barmode: "group",
    grid: { rows: 1, columns: nCols, pattern: "independent" },
    showlegend: true,
    // legenda horizontal embaixo, ancorada no container: não disputa espaço com os painéis nem repete entradas
    legend: { font: { size: legendFont }, orientation: "h", x: 0.5, xanchor: "center", y: 0, yref: "container", yanchor: "bottom" },
    margin: { t: 130, b: tickBlockPx + 34 + legendBlock.heightPx + 24, l: 90, r: 40 },
    // altura em px: área de plotagem mínima de 380px mesmo com legenda de várias linhas (senão as barras ficam achatadas)
    height: 130 + (tickBlockPx + 34 + legendBlock.heightPx + 24) + 380,
    annotations: [],
  };

  devices.forEach((device, i) => {
    const axisSuffix = i === 0 ? "" : i + 1;
    const domainStart = i * (domainWidth + gap);

    layout[`xaxis${axisSuffix}`] = { domain: [domainStart, domainStart + domainWidth], title: { ...axisTitle("Model"), standoff: 8 }, tickangle: -45, tickfont: AXIS_STYLE, automargin: true };
    layout[`yaxis${axisSuffix}`] = { title: axisTitle(i === 0 ? "Inferences per second (IPS)" : ""), gridcolor: "#e5e7eb", rangemode: "tozero", tickfont: AXIS_STYLE, automargin: true };

    const rowsForDevice = chart4Stats.filter((r) => r.device === device);
    const grupos = [...new Set(rowsForDevice.map((r) => buildGroupLabel(r.dataset, r.experimento_id)))].sort();

    grupos.forEach((grupo, gi) => {
      const rowsForGrupo = rowsForDevice.filter((r) => buildGroupLabel(r.dataset, r.experimento_id) === grupo);
      const byModel = new Map(rowsForGrupo.map((r) => [r.modelo, r]));

      const xs = [], ys = [], errPlus = [], errMinus = [];
      modelOrder.forEach((modelo) => {
        const r = byModel.get(modelo);
        if (!r) return;
        // Plota o IPS direto (ips_mean) com os ICs já invertidos por computeChart4Stats.
        // Se um limite for null (IC do tempo não positivo), a barra de erro daquele lado some.
        const ips = r.ips_mean;
        xs.push(modelo);
        ys.push(ips);
        errPlus.push(r.ips_ci_upper != null ? Math.max(0, r.ips_ci_upper - ips) : 0);
        errMinus.push(r.ips_ci_lower != null ? Math.max(0, ips - r.ips_ci_lower) : 0);
      });

      data.push({
        type: "bar",
        name: grupo,
        x: xs,
        y: ys,
        error_y: { type: "data", array: errPlus, arrayminus: errMinus, visible: true },
        marker: { color: colorForGroup(grupo) },
        xaxis: `x${axisSuffix}`,
        yaxis: `y${axisSuffix}`,
        legendgroup: grupo,
        showlegend: !shownGroups.has(grupo), // 1 entrada por grupo (antes: 1 por device -> legenda repetida)
        hovertemplate: `<b>${grupo}</b><br>%{x}<br>IPS: %{y:.2f}<extra></extra>`,
      });
      shownGroups.add(grupo);
    });

    layout.annotations.push(panelHeading(device, domainStart + domainWidth / 2, 20));
  });

  return { data, layout };
}
