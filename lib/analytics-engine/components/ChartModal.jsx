// components/ChartModal.jsx
import React, { useRef, useEffect } from "react";
import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist-min";
import ChartDownloadMenu from "./ChartDownloadMenu.jsx";

/**
 * Versão maximizada de um gráfico: Plotly totalmente interativo (zoom, pan,
 * box-select, reset, hover, toggle de legenda — tudo nativo do Plotly,
 * "navegar dentro do gráfico") + o menu de download completo. Só é montado
 * quando aberto (o dashboard controla isso condicionalmente), então não
 * paga custo nenhum enquanto o usuário só olha as miniaturas.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {object[]} props.data
 * @param {object} props.layout
 * @param {object|Array} props.statsData - para o export CSV/JSON/XLSX
 * @param {string} props.filename
 * @param {() => void} props.onClose
 */
export default function ChartModal({ title, data, layout, statsData, filename, onClose }) {
  const plotRef = useRef(null);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="chart-modal__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="chart-modal__panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="chart-modal__header">
          <h2 className="chart-modal__title">{title}</h2>
          <div className="chart-modal__actions">
            <ChartDownloadMenu plotRef={plotRef} Plotly={Plotly} statsData={statsData} filename={filename} />
            <button type="button" className="chart-modal__close" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>
        </div>

        <div className="chart-modal__body">
          <Plot
            ref={plotRef}
            data={data}
            layout={{ ...layout, autosize: true, margin: { t: 80, b: 60, l: 60, r: 40, ...layout.margin } }}
            config={{
              displayModeBar: true,
              responsive: true,
              displaylogo: false,
              modeBarButtonsToRemove: ["lasso2d"], // box-select cobre o caso de uso; lasso raramente ajuda em gráfico de barras/dispersão científico
            }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>
      </div>
    </div>
  );
}
