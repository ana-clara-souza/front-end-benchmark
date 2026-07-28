'use client';

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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import "./dashboard/dashboard.css";
import "../../lib/analytics-engine/components/analyticsDashboard.css";

import { AnalyticsPayloadProvider } from "../../lib/dashboardData/AnalyticsPayloadContext";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    //Busca a presença do token de autenticação no localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      // Caso não esteja logado, redireciona para a página de login
      router.replace('/');
    } else {
      //Libera a exibição das rotas analíticas protegidas
      setIsAuthenticated(true);
    }
  }, [router]);

  // Evita  vazamento temporário de conteúdo privado
  if (!isAuthenticated) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary">
        <div className="d-flex flex-column align-items-center gap-3">
          <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
            <span className="visually-hidden">Carregando...</span>
          </div>
          <span className="text-secondary small fw-semibold">Verificando autenticação...</span>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsPayloadProvider>
      {children}
    </AnalyticsPayloadProvider>
  );
}