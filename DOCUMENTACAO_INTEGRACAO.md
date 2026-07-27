# Documentação de Integração: Filtros, Dashboard e Layouts

Este documento detalha o funcionamento da conexão de dados entre a página de **Filtros** e o **Dashboard**, além de listar as alterações realizadas nas estruturas de **Layout** e no próprio **Dashboard** para garantir o isolamento de escopo e resolver problemas de compilação.

---

## 1. Conexão Filtros → Dashboard (Handoff de Dados)

A transmissão de informações entre a página de filtros (`/filtros`) e o dashboard de gráficos (`/dashboard`) é feita de forma assíncrona e desacoplada, utilizando um padrão de **handoff passivo** gerenciado por um Contexto React (`AnalyticsPayloadContext`).

### Mecanismo do Fluxo:
1. **Seleção de Parâmetros:** O usuário interage com o formulário em `/filtros` (selecionando experimentos, gráficos desejados e filtro opcional de dispositivo).
2. **Requisição de Dados:** Ao clicar em "Aplicar Filtros", o manipulador `fetchCharts` envia uma única requisição HTTP `POST` contendo os parâmetros e o token JWT no cabeçalho para `https://api-ic-mutt.onrender.com/api/charts`.
3. **Conversão e Normalização:** O JSON recebido do backend é processado por `normalizeNodeResponseIntoMessages(data)`. Essa função é responsável por traduzir o formato da resposta do Node em uma lista contendo mensagens estruturadas de mobile e/ou predição.
4. **Despacho ao Contexto:** A página de filtros chama a função `deliverPayload(messages)`, que atualiza o estado interno do `AnalyticsPayloadContext` e gera um identificador de lote único (`deliveryId`).
5. **Redirecionamento:** O roteador do Next.js executa a navegação de forma programática para `/dashboard` (`router.push('/dashboard')`).
6. **Processamento no Cliente:** O dashboard, ao ser montado, consome o contexto de payload por meio do hook `useAnalyticsFeedFromFilter()`. Este hook executa a função pura de redução da biblioteca (`reduceIncomingMessage` do arquivo `store.js`) sobre as mensagens recebidas para calcular todas as estatísticas. Desta forma, o dashboard renderiza os gráficos sob demanda, sem efetuar chamadas de rede ou conexões WebSocket próprias.

---

## 2. O que foi alterado nos Layouts (`layout.tsx`)

As alterações de layout foram projetadas para isolar as dependências da biblioteca gráfica de outras áreas comuns do aplicativo (como login e cadastro).

### A. Layout Principal (`app/layout.tsx`)
* **Remoção de Fixtures Fictícias:** Foi removida a injeção do componente `<TemporaryFixtureSeed />`. Com isso, a aplicação parou de alimentar o dashboard com dados falsos automáticos.
* **Remoção de Estilos Globais:** A importação global `import "./dashboard/dashboard.css"` foi excluída para evitar que regras de layout do dashboard afetassem as páginas de Login e Cadastro.
* **Desvinculação de Provedor:** A tag do `AnalyticsPayloadProvider` foi retirada deste escopo global.

