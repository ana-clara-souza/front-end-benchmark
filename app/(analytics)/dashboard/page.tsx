'use client';

// ---------------------------------------------------------------------------
// app/dashboard/page.tsx
//
// Reescrito para ser um consumidor PURO (ver prompt de integração, Tarefa 3):
// nenhum estado de filtro, nenhum handler de filtro, nenhuma chamada de
// rede própria. Tudo que esta página faz é:
//   1. Ler o que já foi entregue pela etapa de filtro, via
//      useAnalyticsFeedFromFilter() (hook passivo — não faz fetch, não abre
//      conexão, só reage ao que chegou no AnalyticsPayloadContext).
//   2. Passar isso para buildSlotsFromFeed() (analytics-js-engine), que já
//      resolve sozinho "gerar só os gráficos solicitados".
//   3. Renderizar o resultado com AnalyticsDashboardGrid (miniaturas +
//      maximizar + download PNG/PDF/CSV/JSON/XLSX, tudo já implementado
//      na engine).
//
// A antiga renderização baseada em imagem Base64 (nativeCharts.tsx,
// ChartCard/ChartModal/DataTable manuais, downloadPNG/PDF/CSV/JSON/XLSX
// reimplementados à mão) foi removida — ver app/dashboard/nativeCharts.tsx
// e app/dashboard/mockData.ts, que ficam órfãos após esta mudança.
//
// AnalyticsDashboardGrid é carregado via next/dynamic com ssr:false: ele (e
// tudo que ele importa — ChartCard/ChartModal → react-plotly.js →
// plotly.js-dist-min) só deve existir no bundle do cliente. O bundle do
// Plotly referencia `self` (global de browser) na raiz do módulo; sem esse
// dynamic import, o Next tenta pré-renderizar esta página no servidor
// (mesmo sendo 'use client') e o build inteiro quebra com
// "ReferenceError: self is not defined" ao gerar /dashboard como página
// estática. Confirmado via `next build` local: sem isso o build falha,
// com isso as 8 páginas são geradas normalmente.
// ---------------------------------------------------------------------------

import dynamic from 'next/dynamic';
import Navbar from '../../../components/Navbar';
import { useAnalyticsFeedFromFilter } from '../../../lib/dashboardData/useAnalyticsFeedFromFilter';
import { buildSlotsFromFeed } from '../../../lib/analytics-engine/components/chartRegistry.js';

const AnalyticsDashboardGrid = dynamic(
  () => import('../../../lib/analytics-engine/components/AnalyticsDashboardGrid.jsx'),
  { ssr: false }
);

const STATUS_LABEL: Record<string, string> = {
  waiting: '○ aguardando dados da etapa de filtro',
  received: '● dados recebidos',
  error: '⚠ erro ao receber dados da etapa de filtro',
};

const STATUS_COLOR: Record<string, string> = {
  waiting: '#9ca3af',
  received: '#059669',
  error: '#dc2626',
};

export default function DashboardPage() {
  const feed = useAnalyticsFeedFromFilter();
  const slots = buildSlotsFromFeed(feed.mobile, feed.prediction);

  return (
    <main className="dashboard-page">
      <Navbar userName="Ana" initials="AS" />

      <section className="dashboard-content">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Gráficos</h2>
          <span style={{ fontSize: 13, color: STATUS_COLOR[feed.deliveryStatus] }}>
            {STATUS_LABEL[feed.deliveryStatus]}
          </span>
        </div>

        {/* Erro na ENTREGA em si (ex: a chamada da página de filtro ao Node falhou) */}
        {feed.deliveryError && (
          <div className="dashboard-error">
            <span>⚠ {feed.deliveryError}</span>
          </div>
        )}

        {/* Erro de VALIDAÇÃO de uma mensagem específica (Zod — ver lib/ingest/schema.js) */}
        {feed.lastError && (
          <div className="dashboard-error">
            <span>⚠ {feed.lastError.join(' · ')}</span>
          </div>
        )}

        {feed.deliveryStatus === 'waiting' && (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
            Nenhum dado recebido ainda. Aplique um filtro na página anterior para gerar os gráficos.
          </div>
        )}

        {slots.length > 0 && <AnalyticsDashboardGrid slots={slots} />}
      </section>
    </main>
  );
}
