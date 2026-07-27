// lib/statsUtils.js
// Equivalente a app/charts/utils.py, na parte que não é geração de imagem
// (fig_to_base64 e apply_standard_style não fazem sentido no front — o
// "estilo padronizado" agora é feito via tema/CSS dos componentes).

import jStat from "jstat";

/**
 * Intervalo de confiança de 95% via distribuição t de Student.
 * Espelha compute_ci95() em utils.py exatamente (mesmo fallback).
 *
 * @returns {[number, number]} [ci_lower, ci_upper]
 */
export function computeCI95(mean, std, count) {
  if (count == null || count <= 1 || std == null || Number.isNaN(std)) {
    return [mean, mean];
  }
  const sem = std / Math.sqrt(count);
  const margin = sem * jStat.studentt.inv(0.975, count - 1);
  return [mean - margin, mean + margin];
}

/**
 * Rótulo padronizado de experimento, igual a build_group_label() em utils.py.
 * "{dataset} · {experimento_id}" ou "... ({device})" quando device é passado.
 */
export function buildGroupLabel(dataset, experimentoId, device = null) {
  const label = `${dataset} · ${experimentoId}`;
  return device ? `${label} (${device})` : label;
}

/**
 * Fronteira de Pareto — equivalente a find_pareto_optimal() em etl_prediction.py.
 * Genérica: agnóstica de schema, opera sobre as chaves passadas.
 *
 * @param {object[]} points - linhas (ex: um por experimento)
 * @param {string[]} maximize - chaves a maximizar (ex: ["accuracy"])
 * @param {string[]} minimize - chaves a minimizar (ex: ["mean_inference_time"])
 * @returns {object[]} apenas os pontos Pareto-ótimos
 */
export function findParetoOptimal(points, maximize, minimize) {
  return points.filter((a) => {
    const dominatedByOther = points.some((b) => {
      if (a === b) return false;

      let betterOrEqual = true;
      let strictlyBetter = false;

      for (const key of maximize) {
        if (b[key] < a[key]) { betterOrEqual = false; break; }
        if (b[key] > a[key]) strictlyBetter = true;
      }
      if (!betterOrEqual) return false;

      for (const key of minimize) {
        if (b[key] > a[key]) { betterOrEqual = false; break; }
        if (b[key] < a[key]) strictlyBetter = true;
      }

      return betterOrEqual && strictlyBetter;
    });
    return !dominatedByOther;
  });
}

/**
 * Arredonda replicando round(x, n) do Python (round-half-to-even, IEEE 754
 * correto), não o Math.round ingênuo do JS (que arredonda sempre para cima
 * em empates e pode divergir por causa de imprecisão de ponto flutuante:
 * ex. 2.675 → Python arredonda para 2.67, porque o double armazenado para
 * 2.675 é na verdade ~2.67499999999999982, não exatamente 2.675).
 *
 * Importante: usamos `toFixed(20)` para obter a expansão decimal REAL do
 * double (não a string "round-trip" mais curta que `toString()` devolveria,
 * que teria escondido justamente essa imprecisão e produzido 2.68 em vez
 * de 2.67 no exemplo acima). Validado com fuzz test de 1000 valores
 * aleatórios contra o `round()` real do Python (0 divergências) — ver
 * revisão de fidelidade no PR/documento de requisitos.
 *
 * Trata null/NaN como null (mesmo contrato da versão anterior).
 */
export function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  if (!Number.isFinite(value)) return value;

  const neg = value < 0;
  const abs = Math.abs(value);

  const str = abs.toFixed(20);
  const [intPart, fracPart = ""] = str.split(".");
  if (fracPart.length <= digits) return neg ? -abs : abs;

  const keep = fracPart.slice(0, digits);
  const nextDigit = fracPart[digits];
  const rest = fracPart.slice(digits + 1);

  let roundUp;
  if (nextDigit < "5") roundUp = false;
  else if (nextDigit > "5") roundUp = true;
  else if (/[1-9]/.test(rest)) roundUp = true;
  else {
    const lastKept = digits > 0 ? keep[digits - 1] : intPart[intPart.length - 1];
    roundUp = (parseInt(lastKept || "0", 10) % 2) === 1; // half-to-even
  }

  let num = BigInt(intPart + keep);
  if (roundUp) num += 1n;
  const numStr = num.toString().padStart(intPart.length + digits, "0");

  const newIntLen = numStr.length - digits;
  const newInt = numStr.slice(0, newIntLen) || "0";
  const newFrac = numStr.slice(newIntLen);
  const result = digits > 0 ? Number(`${newInt}.${newFrac}`) : Number(newInt);
  return neg ? -result : result;
}

/** mean/std/count de um array numérico — equivalente ao .agg(mean/std/count) do pandas (std amostral, ddof=1). */
export function summarize(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n <= 1) return { mean, std: null, count: n };
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  return { mean, std: Math.sqrt(variance), count: n };
}

/** Quantil linear (igual ao pandas Series.quantile, interpolação "linear"). */
export function quantile(sortedValues, q) {
  const n = sortedValues.length;
  if (n === 1) return sortedValues[0];
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedValues[lo];
  const frac = pos - lo;
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * frac;
}

/** Agrupa um array de objetos por uma combinação de chaves (equivalente a df.groupby([...])). */
export function groupBy(rows, keys) {
  const map = new Map();
  for (const row of rows) {
    const k = keys.map((key) => row[key]).join("␟"); // separador improvável de colidir
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return [...map.values()];
}
