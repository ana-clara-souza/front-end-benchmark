// lib/ingest/connection.js
//
// Camada de transporte pura: conecta, reconecta com backoff, faz parse de
// JSON e entrega a mensagem crua pra quem chamou. Não sabe nada sobre
// mobile/predição/stats — só entrega bytes. Isso mantém a mesma separação
// que já usamos no resto do motor (transporte não conhece regra de negócio).

/**
 * @param {string} url - endpoint do WebSocket exposto pelo Node
 * @param {(rawPayload: object) => void} onMessage - chamado a cada mensagem JSON válida
 * @param {object} [options]
 * @param {(err: Error) => void} [options.onParseError] - JSON malformado (nem chega a ser um objeto pra validar)
 * @param {(state: "connecting"|"open"|"closed"|"error") => void} [options.onStatusChange]
 * @param {number} [options.maxReconnectDelayMs=10000]
 * @returns {{ close: () => void }}
 */
export function connectAnalyticsSocket(url, onMessage, options = {}) {
  const { onParseError, onStatusChange, maxReconnectDelayMs = 10000 } = options;

  let socket = null;
  let closedByUser = false;
  let reconnectAttempt = 0;
  let reconnectTimer = null;

  function scheduleReconnect() {
    if (closedByUser) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempt, maxReconnectDelayMs);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(open, delay);
  }

  function open() {
    onStatusChange?.("connecting");
    socket = new WebSocket(url);

    socket.onopen = () => {
      reconnectAttempt = 0;
      onStatusChange?.("open");
    };

    socket.onmessage = (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch (err) {
        onParseError?.(err);
        return;
      }
      onMessage(parsed);
    };

    socket.onerror = () => {
      onStatusChange?.("error");
    };

    socket.onclose = () => {
      onStatusChange?.("closed");
      scheduleReconnect();
    };
  }

  open();

  return {
    close() {
      closedByUser = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
