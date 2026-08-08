// components/DatasetDownloadMenu.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  downloadDatasetGroupsCSV,
  downloadDatasetGroupsJSON,
  downloadDatasetGroupsXLSX,
} from "../lib/analytics-engine/lib/export/dataExport.js";

/**
 * Menu de download do CONJUNTO COMPLETO DE DADOS recebido pra gerar todos
 * os gráficos da tela — não as medidas descritivas (accuracy, mean,
 * ci_lower, ...) que cada gráfico individual já exporta no seu próprio
 * modal (ver ChartDownloadMenu.jsx). Aparece uma única vez no cabeçalho do
 * dashboard, não por card/gráfico.
 *
 * Mesmas 3 opções de formato que a seção "Dados (stats)" do menu por
 * gráfico (CSV/JSON/XLSX) — sem PNG/PDF, que não fazem sentido pra uma
 * tabela de dados brutos.
 *
 * @param {object} props
 * @param {Record<string, object[]>} props.datasets - grupos nomeados de
 *   registros brutos já normalizados (ex: {mobile: [...], predicao: [...],
 *   predicao_mobile_data: [...]}) — grupos vazios/ausentes são ignorados
 *   automaticamente pelos exportadores.
 * @param {string} props.filename - nome base do arquivo (sem extensão)
 */
export default function DatasetDownloadMenu({ datasets, filename }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const menuRef = useRef(null);

  const hasData = Object.values(datasets || {}).some((rows) => Array.isArray(rows) && rows.length > 0);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleExport(kind) {
    setBusy(kind);
    try {
      if (kind === "csv") downloadDatasetGroupsCSV(datasets, filename);
      else if (kind === "json") downloadDatasetGroupsJSON(datasets, filename);
      else if (kind === "xlsx") downloadDatasetGroupsXLSX(datasets, filename);
    } catch (err) {
      console.error(`Falha ao exportar conjunto completo (${kind}):`, err);
      alert(`Não foi possível exportar como ${kind.toUpperCase()}: ${err.message}`);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  const options = [
    { kind: "csv", label: "Dados CSV" },
    { kind: "json", label: "Dados JSON" },
    { kind: "xlsx", label: "Dados XLSX" },
  ];

  return (
    <div className="chart-download-menu dataset-download-menu" ref={menuRef}>
      <button
        type="button"
        className="chart-download-menu__trigger dataset-download-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={!hasData}
        aria-haspopup="true"
        aria-expanded={open}
        title={hasData ? "Baixar conjunto completo de dados" : "Nenhum dado recebido ainda"}
      >
        ⬇ Baixar dados completos
      </button>

      {open && (
        <div className="chart-download-menu__panel" role="menu">
          <div className="chart-download-menu__group-label">Conjunto completo (dados brutos)</div>
          {options.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              disabled={busy !== null}
              onClick={() => handleExport(kind)}
              className="chart-download-menu__item"
            >
              {busy === kind ? "Gerando…" : label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}