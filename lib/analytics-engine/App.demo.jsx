// App.demo.jsx
//
// Exemplo de como ligar tudo: useAnalyticsFeed() entrega o estado bruto
// (results de stats), buildSlotsFromFeed() filtra pelo que foi realmente
// solicitado em `charts` e monta a config Plotly via chartRegistry, e
// AnalyticsDashboardGrid cuida do grid/miniatura/modal/export.
//
// O dashboard responde à quantidade de gráficos pedida "de graça": como
// buildSlotsFromFeed() só inclui um slot se `requested.includes(id)`, e o
// CSS do grid usa `repeat(auto-fill, minmax(360px, 1fr))`, pedir 2
// gráficos mostra 2 cards ocupando o espaço disponível, pedir 8 mostra 8
// — nenhuma lógica extra de layout precisa saber "quantos" de antemão.

import React from "react";
import { useAnalyticsFeed } from "./lib/ingest/useAnalyticsFeed.js";
import AnalyticsDashboardGrid from "./components/AnalyticsDashboardGrid.jsx";
import { buildSlotsFromFeed } from "./components/chartRegistry.js";
import "./components/analyticsDashboard.css";

const WS_URL = "wss://seu-node-aqui/analytics-feed"; // ajustar pro endpoint real do Node

export default function App() {
  const feed = useAnalyticsFeed(WS_URL);
  const slots = buildSlotsFromFeed(feed.mobile, feed.prediction);

  return (
    <div>
      <header style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Analytics Dashboard</h1>
        <span style={{ fontSize: 12, color: feed.connectionStatus === "open" ? "#059669" : "#dc2626" }}>
          {feed.connectionStatus === "open" ? "● conectado" : `○ ${feed.connectionStatus}`}
        </span>
      </header>

      {feed.lastError && (
        <div style={{ margin: "0 16px", padding: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#991b1b" }}>
          {feed.lastError.join(" · ")}
        </div>
      )}

      <AnalyticsDashboardGrid slots={slots} />
    </div>
  );
}
