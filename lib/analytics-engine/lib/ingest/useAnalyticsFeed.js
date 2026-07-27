// lib/ingest/useAnalyticsFeed.js
//
// Fina camada de integração com React: liga connection.js (transporte) a
// store.js (reducer puro). Toda a lógica de negócio real já foi testada
// isoladamente em test_ingest.mjs/test_ingest_pred.mjs sem precisar de
// browser — este hook só existe para expor esse estado de forma reativa.

import { useEffect, useRef, useState, useCallback } from "react";
import { connectAnalyticsSocket } from "./connection.js";
import { createInitialState, reduceIncomingMessage } from "./store.js";

/**
 * @param {string} url - endpoint do WebSocket exposto pelo Node
 * @returns {{
 *   mobile: object|null,
 *   prediction: object|null,
 *   lastError: string[]|null,
 *   connectionStatus: "connecting"|"open"|"closed"|"error",
 *   lastUpdatedAt: number|null,
 * }}
 */
export function useAnalyticsFeed(url) {
  const [state, setState] = useState(createInitialState);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const connectionRef = useRef(null);

  const handleMessage = useCallback((rawPayload) => {
    // setState com função: reduceIncomingMessage é puro e determinístico,
    // então é seguro deixar o React decidir quando reprocessar.
    setState((prev) => reduceIncomingMessage(prev, rawPayload));
  }, []);

  useEffect(() => {
    connectionRef.current = connectAnalyticsSocket(url, handleMessage, {
      onStatusChange: setConnectionStatus,
      onParseError: (err) => {
        setState((prev) => ({
          ...prev,
          lastError: [`Mensagem recebida não é JSON válido: ${err.message}`],
          lastUpdatedAt: Date.now(),
        }));
      },
    });

    return () => connectionRef.current?.close();
  }, [url, handleMessage]);

  return { ...state, connectionStatus };
}
