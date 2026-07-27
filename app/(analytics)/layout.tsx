// app/(analytics)/layout.tsx
//
// Route group (não aparece na URL — /dashboard e /filtros continuam com
// esses paths) que existe SÓ pra isolar tudo que a integração da
// analytics-js-engine precisa (Context de handoff, fixture temporária,
// CSS do dashboard/filtro) das demais páginas do app (cadastro,
// recuperar-senha, home). Antes essas peças estavam no layout raiz
// (app/layout.tsx), o que fazia TemporaryFixtureSeed rodar (e
// AnalyticsPayloadProvider existir) em toda página do site, mesmo sem
// nenhuma relação com dashboard. Com este layout, app/layout.tsx volta a
// ser exatamente o que era antes desta integração — nenhuma outra rota
// carrega, executa ou é afetada por nada daqui.

import "./dashboard/dashboard.css";
import "../../lib/analytics-engine/components/analyticsDashboard.css";

import { AnalyticsPayloadProvider } from "../../lib/dashboardData/AnalyticsPayloadContext";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsPayloadProvider>
      {children}
    </AnalyticsPayloadProvider>
  );
}
