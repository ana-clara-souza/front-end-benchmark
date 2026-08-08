// lib/ingest/store.js
//
// Modelo de acumulação decidido com o usuário: cada mensagem chega com o
// snapshot COMPLETO de todos os experimentos que a compõem (nunca
// incremental — reps de um mesmo experimento não chegam espalhados entre
// mensagens). Por isso NÃO há upsert/merge entre mensagens: cada mensagem
// nova SUBSTITUI inteiramente o snapshot anterior do seu domínio.
//
// "Domínio" aqui = mobile (POST /analytics original) ou predição
// (POST /analytics/prediction original) — são tratados como dois slots
// independentes no estado, porque chegam em mensagens separadas e não se
// misturam (uma mensagem de predição já traz seu próprio `mobile_data`
// embutido para o Pareto — não depende do último snapshot mobile recebido
// separadamente).
//
// Esta função é pura (sem I/O, sem WebSocket) de propósito: é o que
// permite testar toda a lógica de roteamento + validação + cálculo sem
// precisar de um browser real, do mesmo jeito que normalize.js/stats*.js
// foram testados contra os golden files Python.

import { detectMessageType } from "./messageType.js";
import { validateMessage } from "./schema.js";
import { normalizeMobileRecords, normalizePredictionRecords, normalizeMobileForPrediction } from "../normalize.js";
import { computeChart1Stats, computeChart2Stats, computeChart3Stats, computeChart4Stats } from "../statsMobile.js";
import {
  computePerformanceDf,
  computeInferenceTimes,
  buildParetoDataset,
  computeF1HeatmapStats,
} from "../predictionMetrics.js";

const ALL_MOBILE_CHARTS = ["chart1", "chart2", "chart3", "chart4"];
const ALL_PREDICTION_CHARTS = ["chart_metrics", "chart_pareto", "chart_pareto_by_dataset", "chart_f1_heatmap"];

/** Estado inicial do feed — nenhuma mensagem recebida ainda. */
export function createInitialState() {
  return {
    mobile: null,      // último snapshot mobile computado (ou null se nunca chegou)
    prediction: null,  // último snapshot de predição computado (ou null)
    lastMessageType: null,
    lastError: null,   // string[] | null — substitui o papel do HTTP 422
    lastUpdatedAt: null,
  };
}

/**
 * Computa o snapshot mobile (chart1-4), respeitando `charts` — gráficos
 * não pedidos ficam null, igual ao AnalyticsResponse original.
 */
function computeMobileSnapshot(message) {
  const requested = message.charts && message.charts.length > 0 ? message.charts : ALL_MOBILE_CHARTS;
  const df = normalizeMobileRecords(message.data);

  const results = { chart1: null, chart2: null, chart3: null, chart4: null };
  if (requested.includes("chart1")) results.chart1 = computeChart1Stats(df);
  if (requested.includes("chart2")) results.chart2 = computeChart2Stats(df);
  if (requested.includes("chart3")) results.chart3 = computeChart3Stats(df);
  if (requested.includes("chart4")) results.chart4 = computeChart4Stats(df);

  return { requested, results, recordCount: df.length, records: df };
}

/**
 * Computa o snapshot de predição (chart_metrics/pareto/pareto_by_dataset/f1_heatmap).
 * `chart_pareto`/`chart_pareto_by_dataset` ficam null se `mobile_data` não
 * vier na mensagem — mesmo comportamento do main.py original.
 */
function computePredictionSnapshot(message) {
  const requested = message.charts && message.charts.length > 0 ? message.charts : ALL_PREDICTION_CHARTS;

  const predDf = normalizePredictionRecords(message.data);
  const perfDf = computePerformanceDf(predDf);

  // Normalizado sempre (não só quando o Pareto é pedido): é dataset bruto
  // recebido na mensagem, então precisa estar disponível pro export do
  // conjunto completo independentemente de quais gráficos foram marcados.
  const mobileForPred = normalizeMobileForPrediction(message.mobile_data);

  const results = { chart_metrics: null, chart_pareto: null, chart_pareto_by_dataset: null, chart_f1_heatmap: null };

  if (requested.includes("chart_metrics")) results.chart_metrics = perfDf;
  if (requested.includes("chart_f1_heatmap")) results.chart_f1_heatmap = computeF1HeatmapStats(predDf);

  const wantsPareto = requested.includes("chart_pareto") || requested.includes("chart_pareto_by_dataset");
  if (wantsPareto) {
    const inferenceSummary = computeInferenceTimes(mobileForPred);
    const paretoDf = buildParetoDataset(perfDf, inferenceSummary); // null se sem mobile_data

    if (requested.includes("chart_pareto")) results.chart_pareto = paretoDf;
    if (requested.includes("chart_pareto_by_dataset") && paretoDf) {
      const byDataset = {};
      for (const row of paretoDf) {
        (byDataset[row.dataset] ??= []).push(row);
      }
      results.chart_pareto_by_dataset = byDataset;
    }
  }

  // `records`: registros de predição brutos normalizados (data[] da mensagem).
  // `mobileData`: execuções mobile brutas normalizadas (mobile_data[] da
  // mensagem, usadas pro Pareto) — null se a mensagem não trouxe mobile_data.
  return { requested, results, recordCount: predDf.length, records: predDf, mobileData: mobileForPred };
}

/**
 * Reducer puro: (estado anterior, mensagem crua do WebSocket) -> novo estado.
 *
 * Nunca lança — mensagem inválida produz `lastError` preenchido e MANTÉM
 * o último snapshot bom (não apaga um dashboard funcionando por causa de
 * uma mensagem malformada isolada).
 */
export function reduceIncomingMessage(prevState, rawPayload) {
  const type = detectMessageType(rawPayload);
  const validation = validateMessage(type, rawPayload);

  if (!validation.ok) {
    return {
      ...prevState,
      lastMessageType: type,
      lastError: validation.errors,
      lastUpdatedAt: Date.now(),
    };
  }

  const message = validation.data;

  if (type === "mobile") {
    return {
      ...prevState,
      mobile: computeMobileSnapshot(message),
      lastMessageType: "mobile",
      lastError: null,
      lastUpdatedAt: Date.now(),
    };
  }

  // type === "prediction"
  return {
    ...prevState,
    prediction: computePredictionSnapshot(message),
    lastMessageType: "prediction",
    lastError: null,
    lastUpdatedAt: Date.now(),
  };
}
