// components/ChartModal.jsx
import React, { useRef, useEffect, useState, useMemo } from "react";
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
 * @param {(widthPx: number) => {data: object[], layout: object}} [props.rebuild] - re-gera a figura para a
 *   largura REAL do corpo do modal. Os builders dimensionam espaçamento/fontes em px a partir dessa largura —
 *   é isso que impede rótulos de eixo/títulos de painel de se sobreporem (e o PNG/PDF exportado herda o
 *   mesmo layout, já que o export usa o gráfico montado aqui).
 * @param {object|Array} props.statsData - para o export CSV/JSON/XLSX
 * @param {string} props.filename
 * @param {() => void} props.onClose
 */
export default function ChartModal({ title, data, layout, rebuild, statsData, filename, onClose }) {
  const plotRef = useRef(null);
  const bodyRef = useRef(null);
  const [body, setBody] = useState({ w: 0, h: 0 });

  // Mede o corpo do modal (arredondado a 16px p/ não re-renderizar a cada pixel de resize)
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = Math.round((el.clientWidth - 16) / 16) * 16; // -16: padding do corpo
      const h = el.clientHeight - 16;
      setBody((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fig = useMemo(() => {
    if (rebuild && body.w > 0) {
      try {
        const f = rebuild(body.w);
        if (f?.data && f?.layout) return f;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Falha ao re-gerar o gráfico para a largura do modal; usando o layout padrão.", err);
      }
    }
    return { data, layout };
  }, [rebuild, body.w, data, layout]);

  // Altura em px definida pelo builder (proporcional ao conteúdo) é respeitada; o corpo rola se passar do modal.
  // Gráficos sem altura própria (chart1-4) continuam preenchendo o modal.
  const figHeight = fig.layout.height ?? (body.h || undefined);
  const figWidth = fig.layout.width; // só definido quando o builder precisou alargar p/ nada se sobrepor (corpo rola na horizontal)

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
            <ChartDownloadMenu plotRef={plotRef} Plotly={Plotly} statsData={statsData} filename={filename} figure={fig} rebuild={rebuild} />
            <button type="button" className="chart-modal__close" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>
        </div>

        <div className="chart-modal__body" ref={bodyRef}>
          <Plot
            ref={plotRef}
            data={fig.data}
            layout={{ ...fig.layout, autosize: true, height: figHeight, margin: { t: 80, b: 60, l: 60, r: 40, ...fig.layout.margin } }}
            config={{
              displayModeBar: true,
              responsive: true,
              displaylogo: false,
              modeBarButtonsToRemove: ["lasso2d"], // box-select cobre o caso de uso; lasso raramente ajuda em gráfico de barras/dispersão científico
            }}
            style={{ width: figWidth ? `${figWidth}px` : "100%", height: figHeight ? `${figHeight}px` : "100%" }}
            useResizeHandler
          />
        </div>
      </div>
    </div>
  );
}
