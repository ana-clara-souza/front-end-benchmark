// lib/predictionMetrics.js
// Equivalente a etl_prediction.py (compute_performance_df, compute_inference_times,
// find_pareto_optimal) + stats_prediction.py (serialização/agrupamento dos 3 gráficos
// de predição). sklearn.metrics não existe no browser, então precision/recall/f1
// (macro e weighted, zero_division=0) são recalculados aqui via matriz de confusão —
// mesma definição matemática que o sklearn usa por baixo.

import { computeCI95, findParetoOptimal, groupBy, round, summarize } from "./statsUtils.js";

const DATASET_ORDER = ["DeepWeeds", "Weed6c"];

/**
 * Precision/Recall/F1 por classe + accuracy, a partir de uma matriz de
 * confusão implícita. zero_division=0 (mesmo default usado no backend original).
 *
 * IMPORTANTE (achado na revisão de fidelidade contra golden files): `classes`
 * pode ser um subconjunto dos valores realmente presentes nos dados (é
 * exatamente o caso de chart_f1_heatmap, que usa só as classes de y_true,
 * enquanto y_pred pode conter valores fora desse conjunto). Por isso o
 * cálculo de TP/FP/FN por classe percorre TODAS as linhas comparando
 * igualdade (nunca indexando um dict por y_true_idx/y_pred_idx), replicando
 * o comportamento do sklearn quando `labels` é um subconjunto: uma predição
 * para uma classe fora de `labels` ainda conta como FP da classe verdadeira
 * (se esta estiver em `labels`), mas nunca "quebra" o cálculo nem é ignorada
 * silenciosamente. A versão anterior indexava um dict por classe e
 * assumia que classes sempre cobria todos os valores vistos — o que é
 * verdade para chart_metrics (classes = união) mas falso para
 * chart_f1_heatmap (classes = só y_true), e lançaria exceção nesse caso.
 */
function perClassMetrics(rows, classes) {
  const n = rows.length;
  const correct = rows.filter((r) => r.y_true_idx === r.y_pred_idx).length;

  const perClass = classes.map((c) => {
    let tp = 0, fp = 0, fn = 0, support = 0;
    for (const r of rows) {
      const trueIsC = r.y_true_idx === c;
      const predIsC = r.y_pred_idx === c;
      if (trueIsC) support += 1;
      if (trueIsC && predIsC) tp += 1;
      else if (!trueIsC && predIsC) fp += 1;
      else if (trueIsC && !predIsC) fn += 1;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { class: c, precision, recall, f1, support };
  });

  const macro = (key) => perClass.reduce((a, r) => a + r[key], 0) / (perClass.length || 1);
  const weighted = (key) =>
    perClass.reduce((a, r) => a + r[key] * r.support, 0) / (n || 1);

  return {
    accuracy: correct / n,
    macroPrecision: macro("precision"),
    macroRecall: macro("recall"),
    macroF1: macro("f1"),
    weightedPrecision: weighted("precision"),
    weightedRecall: weighted("recall"),
    weightedF1: weighted("f1"),
    perClass,
  };
}

/** classes = união de y_true e y_pred (default do sklearn sem `labels` explícito). Usado por chart_metrics. */
function unionClasses(rows) {
  const set = new Set();
  for (const r of rows) { set.add(r.y_true_idx); set.add(r.y_pred_idx); }
  return [...set].sort((a, b) => a - b);
}

/** classes = SOMENTE y_true (replica a assimetria intencional do chart_f1_heatmap.py / stats_prediction.py original). */
function trueOnlyClasses(rows) {
  const set = new Set(rows.map((r) => r.y_true_idx));
  return [...set].sort((a, b) => a - b);
}

/**
 * Equivalente a compute_performance_df(). Uma linha por experimento_id,
 * com accuracy/precision/recall/F1 macro e weighted + std_accuracy
 * (desvio padrão de acertos 0/1, igual ao .apply(...).std() do backend).
 */
export function computePerformanceDf(predictionRecords) {
  const groups = groupBy(predictionRecords, ["experimento_id"]);

  const rows = groups.map((rows) => {
    const experimento_id = rows[0].experimento_id;
    const modelo = rows[0].modelo;
    const dataset = rows[0].dataset;

    const classes = unionClasses(rows); // chart_metrics: labels = união y_true ∪ y_pred (default sklearn)
    const m = perClassMetrics(rows, classes);

    const hits = rows.map((r) => (r.y_true_idx === r.y_pred_idx ? 1 : 0));
    const { std: stdAccuracy } = summarize(hits);

    return {
      experimento_id,
      modelo,
      dataset,
      accuracy: round(m.accuracy, 4),
      std_accuracy: round(stdAccuracy, 4),
      Precision: round(m.macroPrecision, 4),
      Recall: round(m.macroRecall, 4),
      "F1-score": round(m.macroF1, 4),
      wP: round(m.weightedPrecision, 4),
      wR: round(m.weightedRecall, 4),
      wF1: round(m.weightedF1, 4),
    };
  });

  // Ordena dataset canonicamente (DeepWeeds, Weed6c, ...outros), depois modelo, depois experimento_id.
  const datasetRank = (d) => {
    const idx = DATASET_ORDER.indexOf(d);
    return idx === -1 ? DATASET_ORDER.length : idx;
  };
  rows.sort((a, b) => {
    const dr = datasetRank(a.dataset) - datasetRank(b.dataset);
    if (dr !== 0) return dr;
    if (a.dataset !== b.dataset) return a.dataset < b.dataset ? -1 : 1;
    if (a.modelo !== b.modelo) return a.modelo < b.modelo ? -1 : 1;
    return String(a.experimento_id) < String(b.experimento_id) ? -1 : 1;
  });

  return rows;
}

/**
 * Equivalente a compute_inference_times(). Uma linha por
 * (experimento_id, modelo, dataset, device) com tempo médio de inferência.
 * Recebe mobile_data já normalizado (normalizeMobileForPrediction).
 */
export function computeInferenceTimes(mobileRecords) {
  if (!mobileRecords || mobileRecords.length === 0) return null;

  const groups = groupBy(mobileRecords, ["experimento_id", "modelo", "dataset", "device"]);
  return groups.map((rows) => {
    const { experimento_id, modelo, dataset, device } = rows[0];
    const { mean, std, count } = summarize(rows.map((r) => r.inference_time));
    return {
      experimento_id,
      modelo,
      dataset,
      device,
      mean_inference_time: round(mean, 2),
      std_inference_time: round(std, 2),
      count,
    };
  });
}

/**
 * Equivalente ao merge + cálculo de Pareto feito em main.py (rota
 * /analytics/prediction, bloco "chart_pareto"): junta perf_df +
 * inferenceSummary por experimento_id (join exclusivamente por
 * experimento_id — nunca por modelo+dataset, ver RD do documento de
 * requisitos), e marca is_pareto_optimal por CÉLULA (dataset, device).
 *
 * CORREÇÃO DE FIDELIDADE (achada comparando contra golden file Python):
 * a primeira versão deste módulo agrupava só por `dataset`, não por
 * `(dataset, device)`. Isso faz um device mais rápido/acurado "dominar"
 * globalmente pontos de outro device do MESMO dataset, gerando falsos
 * negativos de Pareto-ótimo dentro da célula do device mais lento — não
 * é o que o Python faz (main.py: `valid.groupby(["dataset","device"])`).
 * Cada card (dataset × device) no grid do chart_pareto tem sua própria
 * fronteira local, independente dos outros devices.
 *
 * RF-08.1 (bug já corrigido no Python, preservado aqui): linhas com
 * `mean_inference_time` nulo são excluídas ANTES do cálculo de
 * dominância — em JS, comparações com null/undefined via >/< sempre
 * retornam false, o que faria uma linha nula nunca ser dominada por
 * ninguém (falso positivo de Pareto-ótimo) se não fosse filtrada antes.
 */
export function buildParetoDataset(perfRows, inferenceSummary) {
  if (!inferenceSummary) return null;

  // Lookup 1-para-N (não um Map de valor único): se o mesmo experimento_id
  // aparecer com mais de um device do lado mobile (dado inconsistente na
  // origem), pd.merge(how="left") produz uma linha por combinação
  // encontrada — replicado aqui em vez de silenciosamente ficar só com o
  // último match (ver Seção 9.6 do doc de requisitos).
  const inferByExp = new Map();
  for (const r of inferenceSummary) {
    if (!inferByExp.has(r.experimento_id)) inferByExp.set(r.experimento_id, []);
    inferByExp.get(r.experimento_id).push(r);
  }

  const merged = [];
  for (const r of perfRows) {
    const matches = inferByExp.get(r.experimento_id);
    if (!matches || matches.length === 0) {
      merged.push({ ...r, device: null, mean_inference_time: null, is_pareto_optimal: false });
    } else {
      for (const inf of matches) {
        merged.push({ ...r, device: inf.device, mean_inference_time: inf.mean_inference_time, is_pareto_optimal: false });
      }
    }
  }

  const valid = merged.filter((r) => r.mean_inference_time != null); // filtro de NaN — RF-08.1
  const cells = groupBy(valid, ["dataset", "device"]);

  for (const cell of cells) {
    const paretoPts = findParetoOptimal(cell, ["accuracy"], ["mean_inference_time"]);
    const paretoIds = new Set(paretoPts.map((r) => r.experimento_id));
    for (const r of merged) {
      if (r.dataset === cell[0].dataset && r.device === cell[0].device && paretoIds.has(r.experimento_id)) {
        r.is_pareto_optimal = true;
      }
    }
  }

  return merged;
}

/**
 * Equivalente a compute_chart_f1_heatmap_stats(). F1 por classe, agrupado
 * por (dataset, experimento_id) — cada experimento já fixa um único modelo.
 */
export function computeF1HeatmapStats(predictionRecords) {
  const groups = groupBy(predictionRecords, ["dataset", "experimento_id"]);
  const out = [];
  for (const rows of groups) {
    const { dataset, experimento_id, modelo } = rows[0];
    // RF-06.1: assimetria intencional em relação a chart_metrics — aqui as
    // classes são SOMENTE as de y_true (sorted(unique(y_true))), ignorando
    // valores que só aparecem em y_pred. Replica fielmente o comportamento
    // (não a "correção") do chart_f1_heatmap.py / stats_prediction.py originais.
    const classes = trueOnlyClasses(rows);
    const { perClass } = perClassMetrics(rows, classes);
    for (const c of perClass) {
      out.push({
        dataset,
        experimento_id,
        modelo,
        class: c.class,
        f1: round(c.f1, 4),
      });
    }
  }
  return out;
}
