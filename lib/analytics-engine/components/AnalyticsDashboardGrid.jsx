// components/AnalyticsDashboardGrid.jsx
import React, { useState } from "react";
import ChartCard from "./ChartCard.jsx";
import ChartModal from "./ChartModal.jsx";

/**
 * Grid genérico de dashboard: recebe uma lista de "slots" de gráfico já
 * prontos (title/data/layout/statsData/filename) — quem monta essa lista
 * é o componente pai, combinando o estado de useAnalyticsFeed() com os
 * plotBuilders (buildChart1Plot, buildChart2Plot, ...). Este componente
 * não sabe nada sobre chart1/chart2/etc especificamente — só organiza o
 * grid e controla qual card está maximizado.
 *
 * @param {object} props
 * @param {Array<{
 *   id: string,
 *   title: string,
 *   data: object[]|null,
 *   layout: object|null,
 *   statsData: object|Array|null,
 *   filename: string,
 * }>} props.slots
 */
export default function AnalyticsDashboardGrid({ slots }) {
  const [maximizedId, setMaximizedId] = useState(null);
  const maximizedSlot = slots.find((s) => s.id === maximizedId) ?? null;

  return (
    <div className="analytics-dashboard-grid">
      {slots.map((slot) => (
        <ChartCard
          key={slot.id}
          title={slot.title}
          data={slot.data}
          layout={slot.layout}
          isEmpty={!slot.data || slot.data.length === 0}
          emptyMessage={slot.emptyMessage}
          onMaximize={() => setMaximizedId(slot.id)}
        />
      ))}

      {maximizedSlot && (
        <ChartModal
          title={maximizedSlot.title}
          data={maximizedSlot.data}
          layout={maximizedSlot.layout}
          statsData={maximizedSlot.statsData}
          filename={maximizedSlot.filename}
          onClose={() => setMaximizedId(null)}
        />
      )}
    </div>
  );
}
