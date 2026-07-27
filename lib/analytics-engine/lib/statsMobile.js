// lib/statsMobile.js
// Equivalente a app/stats.py — medidas descritivas para chart1-4.
// Espelha exatamente os agrupamentos do backend original:
//   chart1: por dataset apenas (agregado entre experimentos — deliberado)
//   chart2: dataset + modelo + device + experimento_id
//   chart3/4: modelo + device + dataset + experimento_id

import { computeCI95, groupBy, quantile, round, summarize } from "./statsUtils.js";

/** Equivalente a compute_chart1_stats(). PSS Peak por Dataset (boxplot completo). */
export function computeChart1Stats(records) {
  const groups = groupBy(records, ["dataset"]);
  return groups.map((rows) => {
    const dataset = rows[0].dataset;
    const values = rows.map((r) => r.pss_peak).sort((a, b) => a - b);
    const { mean, std, count } = summarize(values);
    const q1 = quantile(values, 0.25);
    const median = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    const iqr = q3 - q1;
    const whiskerLow = Math.max(values[0], q1 - 1.5 * iqr);
    const whiskerHigh = Math.min(values[values.length - 1], q3 + 1.5 * iqr);
    const outliers = values.filter((v) => v < whiskerLow || v > whiskerHigh);

    return {
      dataset,
      n: count,
      mean: round(mean, 2),
      std: round(std, 2),
      min: round(values[0], 2),
      q1: round(q1, 2),
      median: round(median, 2),
      q3: round(q3, 2),
      max: round(values[values.length - 1], 2),
      iqr: round(iqr, 2),
      whisker_low: round(whiskerLow, 2),
      whisker_high: round(whiskerHigh, 2),
      outliers: outliers.map((v) => round(v, 2)),
    };
  });
}

/** Equivalente a compute_chart2_stats(). PSS Peak médio por Dataset/Modelo/Device/Experimento, IC 95%. */
export function computeChart2Stats(records) {
  const groups = groupBy(records, ["dataset", "modelo", "device", "experimento_id"]);
  return groups.map((rows) => {
    const { dataset, modelo, device, experimento_id } = rows[0];
    const { mean, std, count } = summarize(rows.map((r) => r.pss_peak));
    const [ciLower, ciUpper] = computeCI95(mean, std, count);
    return {
      dataset,
      modelo,
      device,
      experimento_id,
      n: count,
      mean: round(mean, 2),
      std: round(std, 2),
      ci_lower: round(ciLower, 2),
      ci_upper: round(ciUpper, 2),
    };
  });
}

/** Equivalente a compute_chart3_stats(). Tempo de inferência por Modelo/Device/Dataset/Experimento, IC 95%. */
export function computeChart3Stats(records) {
  const groups = groupBy(records, ["modelo", "device", "dataset", "experimento_id"]);
  return groups.map((rows) => {
    const { modelo, device, dataset, experimento_id } = rows[0];
    const { mean, std, count } = summarize(rows.map((r) => r.inference_time));
    const [ciLower, ciUpper] = computeCI95(mean, std, count);
    return {
      modelo,
      device,
      dataset,
      experimento_id,
      n: count,
      mean: round(mean, 2),
      std: round(std, 2),
      ci_lower: round(ciLower, 2),
      ci_upper: round(ciUpper, 2),
    };
  });
}

/** Equivalente a compute_chart4_stats(). IPS = 1000/tempo, derivado por inversão dos CIs de tempo. */
export function computeChart4Stats(records) {
  const groups = groupBy(records, ["modelo", "device", "dataset", "experimento_id"]);
  return groups.map((rows) => {
    const { modelo, device, dataset, experimento_id } = rows[0];
    const { mean, std, count } = summarize(rows.map((r) => r.inference_time));
    const [ciLower, ciUpper] = computeCI95(mean, std, count);
    return {
      modelo,
      device,
      dataset,
      experimento_id,
      n: count,
      ips_mean: round(1000 / mean, 2),
      ips_ci_lower: ciUpper > 0 ? round(1000 / ciUpper, 2) : null,
      ips_ci_upper: ciLower > 0 ? round(1000 / ciLower, 2) : null,
    };
  });
}
