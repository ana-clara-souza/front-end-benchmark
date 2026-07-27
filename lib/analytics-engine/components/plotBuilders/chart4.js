// components/plotBuilders/chart4.js
//
// Replica chart4_ips.py: mesma estrutura de chart3.js (subplot por device,
// hue = "{dataset} · {experimento_id}"), mas plotando IPS = 1000/tempo.
//
// PEGADINHA DE FIDELIDADE: no Python original, `_compute_summary()` de
// chart4_ips.py ordena os modelos por `summary.groupby("modelo")["mean"].mean()`
// — a média do TEMPO de inferência bruto (ascendente), não do IPS. Isso
// porque chart4_ips.py opera sobre o dataframe bruto (tem acesso a
// `mean` = tempo), enquanto `computeChart4Stats()` (stats.py original e
// nosso statsMobile.js) só expõe `ips_mean`/`ips_ci_lower/upper` no
// registro final — e não podemos adicionar `mean` bruto ali sem quebrar a
// fidelidade já validada contra golden file.
//
// Solução: reconstruímos o tempo médio implícito por linha via
// `1000 / ips_mean` (desfaz exatamente a conta que gerou ips_mean, a
// menos do arredondamento de 2 casas já aplicado) e ordenamos por isso —
// equivalente ao Python na prática, e mesmo que o arredondamento
// eventualmente inverta a ordem de dois modelos com tempos praticamente
// idênticos, é um efeito puramente visual (a ordem do eixo X), não uma
// divergência na estatística mostrada.

import { TAB10 } from "../chartTheme.js";
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
export function buildChart4Plot(chart4Stats) {
  const devices = [...new Set(chart4Stats.map((r) => r.device))].sort();
  const modelOrder = globalModelOrderByImpliedTime(chart4Stats);

  const nCols = devices.length;
  const gap = 0.06;
  const domainWidth = (1 - gap * (nCols - 1)) / nCols;

  const data = [];
  const layout = {
    title: "Inferências por Segundo (IPS) por Modelo, Device e Experimento",
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
    layout[`yaxis${axisSuffix}`] = { title: i === 0 ? "IPS (inferências/s)" : "", gridcolor: "#e5e7eb", rangemode: "tozero" };

    const rowsForDevice = chart4Stats.filter((r) => r.device === device);
    const grupos = [...new Set(rowsForDevice.map((r) => buildGroupLabel(r.dataset, r.experimento_id)))].sort();

    grupos.forEach((grupo, gi) => {
      const rowsForGrupo = rowsForDevice.filter((r) => buildGroupLabel(r.dataset, r.experimento_id) === grupo);
      const byModel = new Map(rowsForGrupo.map((r) => [r.modelo, r]));

      const xs = [], ys = [], errPlus = [], errMinus = [];
      modelOrder.forEach((modelo) => {
        const r = byModel.get(modelo);
        if (!r) return;
        xs.push(modelo);
        ys.push(r.ips_mean);
        errPlus.push((r.ips_ci_upper ?? r.ips_mean) - r.ips_mean);
        errMinus.push(r.ips_mean - (r.ips_ci_lower ?? r.ips_mean));
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
        hovertemplate: `<b>${grupo}</b><br>%{x}<br>IPS: %{y:.2f}<extra></extra>`,
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
