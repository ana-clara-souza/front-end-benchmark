// components/plotBuilders/chart2.js
//
// Replica chart2_memory_by_model_dataset.py: um subplot por dataset
// (Plotly não tem "facet" nativo como seaborn — usamos layout.grid com um
// par xaxis/yaxis por dataset), barras agrupadas por modelo, cor por
// "grupo" = "{experimento_id} ({device})" (mesmo formato do original),
// erro assimétrico via error_y.array/arrayminus (deltas, não os bounds
// absolutos — igual à convenção do Recharts que já tínhamos documentado).
//
// Ordenação de modelo: crescente pela média GERAL DENTRO DO SUBPLOT
// (entre grupos daquele dataset) — mesma lógica de
// `plot_data.groupby("modelo")["mean"].mean().sort_values()` no original,
// recalculada por dataset, não globalmente.

import { TAB10 } from "../chartTheme.js";

function modelOrderFor(rowsInDataset) {
  const sums = new Map();
  const counts = new Map();
  for (const r of rowsInDataset) {
    sums.set(r.modelo, (sums.get(r.modelo) ?? 0) + r.mean);
    counts.set(r.modelo, (counts.get(r.modelo) ?? 0) + 1);
  }
  return [...sums.keys()].sort((a, b) => sums.get(a) / counts.get(a) - sums.get(b) / counts.get(b));
}

/**
 * @param {import('../../lib/types').GroupCIStats[]} chart2Stats
 * @returns {{data: object[], layout: object}}
 */
export function buildChart2Plot(chart2Stats) {
  const datasets = [...new Set(chart2Stats.map((r) => r.dataset))];
  const nCols = datasets.length;
  const gap = 0.06;
  const domainWidth = (1 - gap * (nCols - 1)) / nCols;

  const data = [];
  const layout = {
    title: "Mean PSS Peak with 95% Confidence Intervals by Model, Dataset and Experiment",
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
    barmode: "group",
    grid: { rows: 1, columns: nCols, pattern: "independent" },
    showlegend: true,
  };

  datasets.forEach((dataset, i) => {
    const axisSuffix = i === 0 ? "" : i + 1;
    const xKey = `xaxis${axisSuffix}`;
    const yKey = `yaxis${axisSuffix}`;
    const domainStart = i * (domainWidth + gap);

    layout[xKey] = { domain: [domainStart, domainStart + domainWidth], title: "Model", tickangle: -45 };
    layout[yKey] = { title: i === 0 ? "Memory Peak of App (MB)" : "", gridcolor: "#e5e7eb" };

    const rowsInDataset = chart2Stats.filter((r) => r.dataset === dataset);
    const modelOrder = modelOrderFor(rowsInDataset);
    const grupos = [...new Set(rowsInDataset.map((r) => `${r.experimento_id} (${r.device})`))].sort();

    grupos.forEach((grupo, gi) => {
      const rowsForGrupo = rowsInDataset.filter((r) => `${r.experimento_id} (${r.device})` === grupo);
      const byModel = new Map(rowsForGrupo.map((r) => [r.modelo, r]));

      const xs = [];
      const ys = [];
      const errPlus = [];
      const errMinus = [];
      modelOrder.forEach((modelo) => {
        const r = byModel.get(modelo);
        if (!r) return; // esse grupo não tem esse modelo — barra simplesmente não aparece nessa posição
        xs.push(modelo);
        ys.push(r.mean);
        errPlus.push(r.ci_upper - r.mean);
        errMinus.push(r.mean - r.ci_lower);
      });

      data.push({
        type: "bar",
        name: grupo,
        legendgroup: `dataset-${i}`,
        x: xs,
        y: ys,
        error_y: { type: "data", array: errPlus, arrayminus: errMinus, visible: true },
        marker: { color: TAB10[gi % TAB10.length] },
        xaxis: `x${axisSuffix}`,
        yaxis: `y${axisSuffix}`,
        showlegend: true,
        hovertemplate: `<b>${grupo}</b><br>%{x}<br>Média: %{y:.2f} MB<extra></extra>`,
      });
    });

    // Anotação com o nome do dataset acima de cada subplot (equivalente ao ax.set_title(f"Mean PSS Peak — {dataset}"))
    layout.annotations = [
      ...(layout.annotations ?? []),
      {
        text: `<b>${dataset}</b>`,
        showarrow: false,
        x: domainStart + domainWidth / 2,
        xref: "paper",
        y: 1.06,
        yref: "paper",
        font: { size: 13 },
      },
    ];
  });

  return { data, layout };
}
