// components/ChartCard.jsx
import React from "react";
import Plot from "react-plotly.js";

const THUMB_FONT = 9;

/**
 * A miniatura tem ~320px de altura, mas os builders desenham com fontes de
 * 16-24px pensadas pro modal/PDF. Sem reduzir, ticks e títulos se sobrepõem
 * e as anotações de título de painel (y = 1.05 em coordenadas de paper)
 * ficam cortadas pela margem t:8. Aqui só a miniatura é ajustada — o layout
 * original (modal/download) não é tocado.
 */
function toThumbnail(data, layout) {
  const l = { ...layout, title: undefined, showlegend: false, font: { size: THUMB_FONT }, margin: { t: 34, r: 8, b: 40, l: 8 } };
  for (const k of Object.keys(l)) {
    if (/^[xy]axis\d*$/.test(k)) {
      const ax = l[k];
      l[k] = {
        ...ax,
        automargin: true,
        tickfont: { ...ax.tickfont, size: THUMB_FONT },
        title: ax.title && ax.title.text ? { ...ax.title, font: { ...ax.title.font, size: THUMB_FONT } } : ax.title,
      };
    }
  }
  l.annotations = (layout.annotations ?? []).map((a) => ({ ...a, font: { ...a.font, size: 10 } }));
  const d = data.map((t) => ({
    ...t,
    ...(t.textfont ? { textfont: { ...t.textfont, size: 8 } } : {}),
    ...(t.colorbar ? { colorbar: { ...t.colorbar, thickness: 8, tickfont: { size: 8 } } } : {}),
    ...(t.marker && t.marker.size ? { marker: { ...t.marker, size: 7 } } : {}),
  }));
  return { data: d, layout: l };
}

/**
 * Miniatura de um gráfico no grid do dashboard. Renderiza o MESMO `data`/
 * `layout` do gráfico real, mas com `staticPlot: true` — desliga hover,
 * zoom, modebar e todos os listeners do Plotly, então é bem mais leve que
 * a versão interativa. Clicar (ou no botão "maximizar") abre o modal com
 * a versão completa, interativa, montada sob demanda.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {object[]} props.data - traces do Plotly
 * @param {object} props.layout - layout do Plotly
 * @param {() => void} props.onMaximize
 * @param {boolean} [props.isEmpty] - true quando o gráfico foi solicitado mas não há dados pra desenhar (ex: chart_pareto sem mobile_data) — NUNCA deve ser true para um gráfico que simplesmente não foi pedido, esse caso não deve nem virar card (ver chartRegistry.js/buildSlotsFromFeed)
 * @param {string} [props.emptyMessage] - explica o motivo do vazio (ex: "chart_pareto requer mobile_data") em vez de um genérico "sem dados"
 */
export default function ChartCard({ title, data, layout, onMaximize, isEmpty = false, emptyMessage = "Sem dados para este gráfico" }) {
  const thumb = isEmpty ? null : toThumbnail(data, layout);
  return (
    <div className="chart-card" role="group" aria-label={title}>
      <div className="chart-card__header">
        <span className="chart-card__title">{title}</span>
        {!isEmpty && (
          <button
            type="button"
            className="chart-card__maximize"
            onClick={onMaximize}
            title="Maximizar"
            aria-label={`Maximizar ${title}`}
          >
            ⤢
          </button>
        )}
      </div>

      <div className="chart-card__body">
        {isEmpty ? (
          <div className="chart-card__empty">{emptyMessage}</div>
        ) : (
          <Plot
            data={thumb.data}
            layout={thumb.layout}
            config={{ staticPlot: true, displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
            onClick={onMaximize}
          />
        )}
      </div>
    </div>
  );
}
