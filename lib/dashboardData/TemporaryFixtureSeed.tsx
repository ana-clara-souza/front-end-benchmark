// lib/dashboardData/TemporaryFixtureSeed.tsx
//
// TEMPORÁRIO — remover este componente (e sua referência em app/layout.tsx)
// assim que a página de filtro real existir e passar a chamar
// `deliverPayload(...)` por conta própria depois da chamada ao Node.
//
// Não renderiza nada visível; só entrega FIXTURE_MESSAGES ao
// AnalyticsPayloadContext uma vez, no mount, pra deixar /dashboard
// navegável/demonstrável antes da página de filtro existir. Nenhum outro
// arquivo (dashboard/page.tsx incluído) sabe que isso existe — dashboard
// só lê o que está no Context, não importa se veio da fixture ou de uma
// entrega real.

"use client";

import { useEffect, useRef } from "react";
import { useAnalyticsPayloadContext } from "./AnalyticsPayloadContext";
import { FIXTURE_MESSAGES } from "./fixturePayload";

export default function TemporaryFixtureSeed() {
  const { deliverPayload } = useAnalyticsPayloadContext();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    deliverPayload(FIXTURE_MESSAGES);
  }, [deliverPayload]);

  return null;
}
