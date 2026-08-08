// lib/export/dataExport.js
//
// Duas camadas deliberadamente separadas:
//   - rowsToCSV / rowsToJSON / rowsToXLSXBuffer: PURAS, sem tocar em
//     `document`/Blob/URL — testáveis em Node, como todo o resto do motor.
//   - downloadBlob / downloadCSV / downloadJSON / downloadXLSX: só existem
//     no browser (usam URL.createObjectURL), chamadas pelos componentes.

import * as XLSX from "xlsx";

/**
 * Achata a saída de chart_pareto_by_dataset (Record<dataset, Row[]>) para
 * uma lista única de linhas — todo exportador de dados trabalha com listas
 * planas; cada linha já carrega `dataset`, então nada se perde ao achatar.
 */
export function flattenIfGrouped(statsData) {
  if (Array.isArray(statsData)) return statsData;
  if (statsData && typeof statsData === "object") {
    return Object.values(statsData).flat();
  }
  return [];
}

/** Escapa um valor para uma célula CSV (RFC 4180: aspas duplicadas, campo entre aspas se tiver vírgula/aspas/quebra de linha). */
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) value = value.join(";"); // ex: outliers do chart1
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Converte uma lista de objetos (mesmo formato, uma linha por objeto) em
 * uma string CSV. Colunas = união de todas as chaves vistas, na ordem de
 * primeira aparição (não assume que a primeira linha tem todas as colunas
 * — colunas opcionais como `std`/`ci_lower` podem faltar em alguma linha).
 */
export function rowsToCSV(rows) {
  const flat = flattenIfGrouped(rows);
  if (flat.length === 0) return "";

  const columns = [];
  const seen = new Set();
  for (const row of flat) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) { seen.add(key); columns.push(key); }
    }
  }

  const header = columns.map(csvEscape).join(",");
  const lines = flat.map((row) => columns.map((c) => csvEscape(row[c])).join(","));
  return [header, ...lines].join("\n");
}

/** JSON "bonito" (indentado) — export mais simples, preserva a estrutura original (inclusive agrupada, ex: chart_pareto_by_dataset). */
export function rowsToJSON(statsData) {
  return JSON.stringify(statsData, null, 2);
}

/** Gera um Buffer/Uint8Array .xlsx (SheetJS) a partir de uma lista de linhas — testável em Node (não depende de browser). */
export function rowsToXLSXBuffer(rows, sheetName = "dados") {
  const flat = flattenIfGrouped(rows);
  const worksheet = XLSX.utils.json_to_sheet(flat);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

// ---------------------------------------------------------------------------
// Gatilhos de download — só funcionam no browser (usam document/Blob/URL)
// ---------------------------------------------------------------------------

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(rows, filename) {
  const csv = rowsToCSV(rows);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadJSON(statsData, filename) {
  const json = rowsToJSON(statsData);
  downloadBlob(new Blob([json], { type: "application/json" }), filename.endsWith(".json") ? filename : `${filename}.json`);
}

export function downloadXLSX(rows, filename) {
  const buffer = rowsToXLSXBuffer(rows);
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  );
}
// ---------------------------------------------------------------------------
// Export do CONJUNTO COMPLETO DE DADOS (dataset bruto recebido pra gerar os
// gráficos — ExperimentRecord[]/PredictionRecord[]/MobileExecutionRecord[]
// já normalizados, ver lib/ingest/store.js), NÃO as medidas descritivas
// (accuracy, mean, ci_lower, ...) que downloadCSV/JSON/XLSX acima já exportam
// por gráfico. Usado pelo botão único na tela do dashboard (todos os
// gráficos), não no modal de um gráfico individual.
//
// Diferença de granularidade dos outros grupos existentes (ex:
// chart_pareto_by_dataset): aqui os grupos são DOMÍNIOS com esquemas de
// coluna diferentes entre si (execução mobile vs. predição), não partições
// do mesmo esquema — por isso XLSX ganha uma aba por grupo (em vez de
// achatar tudo numa aba só) e o CSV marca a origem de cada linha em
// `_conjunto` (em vez de simplesmente concatenar colunas incompatíveis).
// ---------------------------------------------------------------------------

/** Remove grupos vazios/ausentes — usado pelos três exportadores abaixo e por quem monta a UI (pra saber se há algo pra baixar). */
function nonEmptyGroups(groups) {
  return Object.fromEntries(
    Object.entries(groups || {}).filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
  );
}

/**
 * Marca cada linha com `_conjunto` = nome do grupo de origem (ex: "mobile",
 * "predicao"), preservando a proveniência quando os grupos são achatados
 * numa lista única (CSV, que não tem conceito de aba/domínio). Não achata
 * sozinho — quem chama decide se quer flatten (ver flattenIfGrouped).
 */
export function tagDatasetGroups(groups) {
  const tagged = {};
  for (const [name, rows] of Object.entries(nonEmptyGroups(groups))) {
    tagged[name] = rows.map((row) => ({ _conjunto: name, ...row }));
  }
  return tagged;
}

/**
 * .xlsx com UMA ABA POR GRUPO (mobile/predição/mobile_data da predição),
 * ao contrário de rowsToXLSXBuffer (sempre achata pra uma aba só) — aqui os
 * grupos têm colunas diferentes entre si, então uma aba única misturaria
 * esquemas incompatíveis na mesma tabela.
 *
 * @param {Record<string, object[]>} groups - ex: {mobile: [...], predicao: [...]}
 */
export function datasetGroupsToXLSXBuffer(groups) {
  const clean = nonEmptyGroups(groups);
  const workbook = XLSX.utils.book_new();
  const names = Object.keys(clean);

  if (names.length === 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([]), "dados");
  } else {
    for (const name of names) {
      const worksheet = XLSX.utils.json_to_sheet(clean[name]);
      // Nome de aba do Excel: máx. 31 caracteres, sem : \ / ? * [ ].
      const sheetName = name.replace(/[:\\/?*[\]]/g, "_").slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  }
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

export function downloadDatasetGroupsCSV(groups, filename) {
  downloadCSV(tagDatasetGroups(groups), filename);
}

export function downloadDatasetGroupsJSON(groups, filename) {
  // JSON preserva a estrutura agrupada nativamente (chave = grupo) — não
  // precisa do `_conjunto` que o CSV precisa pra não perder a proveniência.
  downloadJSON(nonEmptyGroups(groups), filename);
}

export function downloadDatasetGroupsXLSX(groups, filename) {
  const buffer = datasetGroupsToXLSXBuffer(groups);
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  );
}
