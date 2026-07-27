// components/ChartCard.jsx
import React from "react";
import Plot from "react-plotly.js";

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
            data={data}
            layout={{ ...layout, title: undefined, margin: { t: 8, r: 8, b: 24, l: 32 } }}
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
