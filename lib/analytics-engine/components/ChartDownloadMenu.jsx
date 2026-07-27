// components/ChartDownloadMenu.jsx
import React, { useState, useRef, useEffect } from "react";
import { downloadCSV, downloadJSON, downloadXLSX } from "../lib/export/dataExport.js";
import { exportPNG, exportPDF } from "../lib/export/imageExport.js";

/**
 * @param {object} props
 * @param {React.RefObject} props.plotRef - ref do componente <Plot> (react-plotly.js) — precisa estar montado (só existe dentro do modal, não na miniatura staticPlot)
 * @param {object} props.Plotly - módulo plotly.js-dist-min já importado (passado por quem monta o <Plot>, pra não duplicar o bundle)
 * @param {object|Array} props.statsData - dados usados para export CSV/JSON/XLSX (pode ser array plano ou agrupado por dataset)
 * @param {string} props.filename - nome base do arquivo (sem extensão)
 * @param {boolean} [props.imageExportEnabled=true] - desliga PNG/PDF quando plotRef ainda não montou (ex: dentro da miniatura)
 */
export default function ChartDownloadMenu({ plotRef, Plotly, statsData, filename, imageExportEnabled = true }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null); // qual export está em andamento, pra desabilitar o botão
  const menuRef = useRef(null);

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
      const gd = plotRef?.current?.el;
      if (kind === "png") {
        if (!gd) throw new Error("Gráfico ainda não está pronto para exportar imagem.");
        await exportPNG(gd, Plotly, filename);
      } else if (kind === "pdf") {
        if (!gd) throw new Error("Gráfico ainda não está pronto para exportar imagem.");
        await exportPDF(gd, Plotly, filename);
      } else if (kind === "csv") {
        downloadCSV(statsData, filename);
      } else if (kind === "json") {
        downloadJSON(statsData, filename);
      } else if (kind === "xlsx") {
        downloadXLSX(statsData, filename);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Falha ao exportar ${kind}:`, err);
      alert(`Não foi possível exportar como ${kind.toUpperCase()}: ${err.message}`);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  const imageOptions = [
    { kind: "png", label: "Imagem PNG" },
    { kind: "pdf", label: "Imagem PDF" },
  ];
  const dataOptions = [
    { kind: "csv", label: "Dados CSV" },
    { kind: "json", label: "Dados JSON" },
    { kind: "xlsx", label: "Dados XLSX" },
  ];

  return (
    <div className="chart-download-menu" ref={menuRef}>
      <button
        type="button"
        className="chart-download-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Baixar"
      >
        ⬇
      </button>

      {open && (
        <div className="chart-download-menu__panel" role="menu">
          <div className="chart-download-menu__group-label">Imagem do gráfico</div>
          {imageOptions.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              disabled={!imageExportEnabled || busy !== null}
              onClick={() => handleExport(kind)}
              className="chart-download-menu__item"
            >
              {busy === kind ? "Gerando…" : label}
            </button>
          ))}

          <div className="chart-download-menu__group-label">Dados (stats)</div>
          {dataOptions.map(({ kind, label }) => (
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
