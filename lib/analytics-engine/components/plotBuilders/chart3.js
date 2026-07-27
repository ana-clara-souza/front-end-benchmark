// components/plotBuilders/chart3.js
//
// Replica chart3_inference_time.py: um subplot por DEVICE (dinâmico —
// quantidade varia conforme os devices presentes), barras agrupadas por
// modelo, cor por "grupo" = "{dataset} · {experimento_id}" (build_group_label,
// sem device no rótulo — o device já é a própria coluna/subplot).
//
// DIFERENÇA IMPORTANTE em relação a chart2: a ordenação de modelo aqui é
// GLOBAL — calculada uma vez sobre TODA a tabela (média entre todos os
// devices/experimentos), igual a `_compute_summary()` em
// chart3_inference_time.py, que faz `summary.groupby("modelo")["mean"].mean()`
// sobre o `summary` inteiro ANTES de fatiar por device. Em chart2, a
// ordenação é recalculada por dataset. Não são a mesma função por isso —
// se um dia usarmos a mesma helper pras duas, ela precisa de um parâmetro
// pra saber se agrupa "antes" ou "depois" de fatiar.

import { TAB10 } from "../chartTheme.js";
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
export function buildChart3Plot(chart3Stats) {
  const devices = [...new Set(chart3Stats.map((r) => r.device))].sort();
  const modelOrder = globalModelOrder(chart3Stats); // uma vez só, sobre TODA a tabela

  const nCols = devices.length;
  const gap = 0.06;
  const domainWidth = (1 - gap * (nCols - 1)) / nCols;

  const data = [];
  const layout = {
    title: "Tempo de Inferência por Modelo, Device e Experimento",
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    barmode: "group",
    grid: { rows: 1, columns: nCols, pattern: "independent" },
    showlegend: true,
    annotations: [],
  };

  devices.forEach((device, i) => {
    const axisSuffix = i === 0 ? "" : i + 1;
    const domainStart = i * (domainWidth + gap);

    layout[`xaxis${axisSuffix}`] = { domain: [domainStart, domainStart + domainWidth], title: "Modelo", tickangle: -45 };
    layout[`yaxis${axisSuffix}`] = { title: i === 0 ? "Tempo de Inferência (ms)" : "", gridcolor: "#e5e7eb" };

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
        showlegend: true,
        hovertemplate: `<b>${grupo}</b><br>%{x}<br>Média: %{y:.2f} ms<extra></extra>`,
      });
    });

    layout.annotations.push({
      text: `<b>${device}</b>`,
      showarrow: false,
      x: domainStart + domainWidth / 2,
      xref: "paper",
      y: 1.06,
      yref: "paper",
      font: { size: 13 },
    });
  });

  return { data, layout };
}
