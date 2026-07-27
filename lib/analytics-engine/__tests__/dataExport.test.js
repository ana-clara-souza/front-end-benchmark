// __tests__/dataExport.test.js
import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { rowsToCSV, rowsToJSON, rowsToXLSXBuffer, flattenIfGrouped } from "../lib/export/dataExport.js";

const golden = JSON.parse(readFileSync(new URL("../golden/golden_v1.json", import.meta.url)));

describe("rowsToCSV", () => {
  test("gera cabeçalho com todas as colunas e uma linha por registro", () => {
    const csv = rowsToCSV(golden.chart1);
    const lines = csv.split("\n");
    expect(lines.length).toBe(golden.chart1.length + 1); // +1 cabeçalho
    expect(lines[0]).toContain("dataset");
    expect(lines[0]).toContain("outliers");
  });

  test("colunas opcionais ausentes em algumas linhas não quebram (união de chaves)", () => {
    const rows = [{ a: 1, b: 2 }, { a: 3, c: 4 }]; // linha 2 não tem "b", tem "c" extra
    const csv = rowsToCSV(rows);
    const [header, l1, l2] = csv.split("\n");
    expect(header).toBe("a,b,c");
    expect(l1).toBe("1,2,");
    expect(l2).toBe("3,,4");
  });

  test("array (ex: outliers) vira lista separada por ; dentro da célula", () => {
    const csv = rowsToCSV([{ outliers: [1.5, 2.5] }]);
    expect(csv).toContain("1.5;2.5");
  });

  test("valor com vírgula é escapado entre aspas", () => {
    const csv = rowsToCSV([{ nome: "a, b" }]);
    expect(csv.split("\n")[1]).toBe('"a, b"');
  });

  test("estrutura agrupada (chart_pareto_by_dataset) é achatada automaticamente", () => {
    const grouped = { Weed6c: golden.chart_pareto.filter((r) => r.dataset === "Weed6c") };
    const csv = rowsToCSV(grouped);
    expect(csv.split("\n").length - 1).toBe(grouped.Weed6c.length);
  });
});

describe("rowsToJSON", () => {
  test("é um JSON válido que faz round-trip para os mesmos dados", () => {
    const json = rowsToJSON(golden.chart2);
    expect(JSON.parse(json)).toEqual(golden.chart2);
  });
});

describe("rowsToXLSXBuffer", () => {
  test("gera um .xlsx que relido tem as mesmas linhas/valores", () => {
    const buffer = rowsToXLSXBuffer(golden.chart3, "chart3");
    const wb = XLSX.read(buffer, { type: "array" });
    const reread = XLSX.utils.sheet_to_json(wb.Sheets["chart3"]);
    expect(reread.length).toBe(golden.chart3.length);
    expect(reread[0].modelo).toBe(golden.chart3[0].modelo);
  });

  test("estrutura agrupada também funciona (achatada antes de virar planilha)", () => {
    const grouped = { A: [{ x: 1 }], B: [{ x: 2 }] };
    const buffer = rowsToXLSXBuffer(grouped);
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames[0];
    expect(XLSX.utils.sheet_to_json(wb.Sheets[sheetName]).length).toBe(2);
  });
});

describe("flattenIfGrouped", () => {
  test("lista já plana passa direto", () => {
    expect(flattenIfGrouped([{ a: 1 }])).toEqual([{ a: 1 }]);
  });
  test("dict agrupado por dataset vira lista única", () => {
    expect(flattenIfGrouped({ X: [{ a: 1 }], Y: [{ a: 2 }] }).length).toBe(2);
  });
});
