# Finalização do Front-end (Cadastro, Autenticação e Filtro)

Este documento cobre **tudo que não é a página de Dashboard**: login,
cadastro, recuperação de senha e a página de filtro. A geração dos
gráficos (`/dashboard` + `lib/analytics-engine/`) já está pronta,
validada (53/53 testes passando contra os goldens do Python original) e
**não deve ser alterada** neste trabalho.

## 0. A regra mais importante: o fluxo Filtro → Dashboard
> **Ao receber a resposta do backend (Node), a página de filtro deve
> entregar esses dados DIRETAMENTE para o dashboard — nunca renderizar
> nada de gráfico ela mesma.**

Isso **já está implementado e funcionando** em
`app/(analytics)/filtros/page.tsx`, através de um mecanismo de "handoff"
que não deve ser tocado. O fluxo é este:
```
[Usuário aplica filtro em /filtros]
        │
        ▼
fetchCharts() faz POST para o Node (URL/payload já implementados)
        │
        ▼
Node responde com REGISTROS BRUTOS (não mais imagem+stats prontos —
ver CONTRATO_BACKEND_NODE.md)
        │
        ▼
normalizeNodeResponseIntoMessages(data)  →  transforma a resposta em
                                             1 ou 2 "mensagens" no
                                             formato que a engine entende
        │
        ▼
deliverPayload(messages)   →   entrega as mensagens para o
                                AnalyticsPayloadContext (Context React
                                compartilhado entre /filtros e /dashboard)
        │
        ▼
router.push('/dashboard')  →  navega para o dashboard
        │
        ▼
/dashboard lê o Context (via useAnalyticsFeedFromFilter) e desenha os
gráficos automaticamente — sem nenhuma chamada de rede própria
```

Ou seja: **a página de filtro nunca guarda a resposta do Node numa
variável de estado local pra desenhar gráfico nenhum.** Ela só faz o
fetch, normaliza, entrega via `deliverPayload`, e navega. Todo o resto
(cálculo estatístico, geração das imagens Plotly, tabelas, download)
acontece do lado de dentro do `/dashboard`, sozinho, reagindo ao que
chegou no Context.

**Se em algum momento da finalização a página de filtro parecer estar
"precisando" desenhar ou pré-visualizar um gráfico antes de navegar —
pare.** Isso não faz parte do escopo do filtro; é sinal de que algo saiu
do fluxo acima.

## 1. Zona protegida — não alterar em nenhuma hipótese

| Caminho | Por quê |
|---|---|
| `lib/analytics-engine/**` (engine inteira) | Validada byte-a-byte contra a API Python de referência (53/53 testes). Qualquer edição aqui invalida essa garantia. |
| `app/(analytics)/dashboard/page.tsx` | Página de dashboard já pronta — consumidor puro do Context, sem lógica de filtro. |
| `lib/dashboardData/AnalyticsPayloadContext.tsx` | Mecanismo de handoff (item 0). Não faz fetch, não sabe nada de Node/Mongo — só transporta o payload. |
| `lib/dashboardData/useAnalyticsFeedFromFilter.ts` | Hook que alimenta o dashboard a partir do Context, delegando validação (Zod) e cálculo pra engine. |
| `lib/dashboardData/normalizeNodeResponse.ts` | Só deve mudar se o **formato** da resposta do Node mudar de verdade (ver seção 4) — nunca pra "ajustar" alguma coisa da UI de filtro. |

Antes de abrir PR, rodar:

```bash
cd lib/analytics-engine && npm install && npm test   # tem que continuar 53/53
```

## 2. Arquivo por arquivo — o que fazer em cada um

### `app/page.tsx` (login) — **implementar do zero**
Hoje é só HTML estático: os campos de email/senha não são controlados
(sem `value`/`onChange`), não existe `onSubmit`, e o botão "Entrar" é
literalmente um link (`<a href="/dashboard">`) que navega pro dashboard
sem checar nada. Precisa:
- Estado controlado dos campos + `onSubmit` chamando o endpoint de login
  do Node (mesmo backend do cadastro, provavelmente
  `https://api-ic-mutt.onrender.com/api/...` — confirmar rota exata com
  quem mantém o Node).
- Tratamento de erro de credencial inválida.
- Alguma forma de guardar a sessão (token/cookie — usar o padrão que o
  time já usa em outros projetos, se houver).
- Trocar o `<a href="/dashboard">` por navegação programática **só após**
  login confirmado.

### `app/cadastro/page.tsx` — **3 correções pontuais de tipo, comportamento já funciona**
O fluxo de cadastro (fetch, loading, mensagem de sucesso/erro) já está
implementado e funcional. Só bloqueia o `next build` por 3 erros de
TypeScript (projeto está em modo `strict`):

```
linha 20: function handleChange(e) { ... }
linha 29: async function handleSubmit(e) { ... }
linha 67: catch (error) { ...error.message }
```

Correção (sem mudar nenhum comportamento):

```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) { ... }
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) { ... }
// no catch:
catch (error) {
  const message = error instanceof Error ? error.message : 'Erro ao conectar com o servidor.';
  setErro(message);
}
```

Validei numa cópia local: com só essas 3 linhas corrigidas, `next build`
gera as 8 páginas estáticas sem nenhum outro erro.

### `app/recuperar-senha/page.tsx` — **implementar do zero**
Mesma situação do login: layout pronto, zero lógica. Os 6 inputs de
código não têm `value`/`onChange`, o botão "Verificar código" não tem
`onClick`, "Reenviar código" é um `<a href="#">` morto. Precisa de fluxo
real de recuperação de senha integrado ao Node (envio de código, validação,
definição de nova senha).

### `app/(analytics)/filtros/page.tsx` — **finalizar UI/UX + corrigir o filtro de device (ver seção 3)**
A lógica de rede (`fetchCharts`) **já está pronta e correta** — chama o
Node, normaliza a resposta e entrega pro dashboard via `deliverPayload`
(exatamente o fluxo da seção 0). O que falta é:
- UI/UX da página em si (esse painel de filtro foi só extraído do
  dashboard antigo, nunca foi desenhado como página própria).
- **Corrigir o filtro de Device** — é o ponto mais importante desta
  seção, ver item 3 abaixo.
- Validar se a lista de "Experimentos" (`[1,2,3,4]`, hardcoded) deve
  continuar como IDs numéricos fixos ou passar a vir de uma consulta real
  ao Node (provavelmente deveria — hoje são 4 valores fixos sem relação
  com dados reais).

**Não mexer**: a chamada `fetch(...)`, `normalizeNodeResponseIntoMessages`,
`deliverPayload(messages)` e `router.push('/dashboard')` no final de
`fetchCharts`. Essa parte é o próprio fluxo da seção 0 — qualquer ajuste
de UI deve envolver só o JSX do formulário, os `useState` de filtro
(dataset, device, experimentos, charts selecionados) e o payload que é
montado a partir deles.

### `app/(analytics)/layout.tsx` — **1 remoção, no fim do trabalho**
Este arquivo hoje monta um `<TemporaryFixtureSeed />` que injeta dados
falsos automaticamente assim que `/filtros` ou `/dashboard` são
acessados — foi um artifício temporário pra deixar o dashboard
demonstrável antes de `/filtros` existir de verdade. **Assim que a
página de filtro estiver chamando `deliverPayload` de verdade**, remover:

1. A linha `<TemporaryFixtureSeed />` (e o import correspondente) deste
   arquivo.
2. Os arquivos `lib/dashboardData/TemporaryFixtureSeed.tsx` e
   `lib/dashboardData/fixturePayload.ts` (não são usados por mais
   ninguém).

Sem essa remoção, o dashboard vai sempre mostrar dado fictício, mesmo
depois do filtro real estar pronto — pode mascarar bugs de integração
durante os testes.

### `components/Navbar.tsx` — **receber usuário real**
Hoje `userName`/`initials` são passados como props fixas (`"Ana"`/`"AS"`)
direto em `dashboard/page.tsx` e `filtros/page.tsx`. Quando o login
estiver implementado, trocar essas props fixas pelos dados reais da
sessão do usuário logado.

### `app/BootstrapClient.tsx` — **1 ajuste de lint, opcional mas recomendado**
```tsx
useEffect(() => {
  require("bootstrap/dist/js/bootstrap.bundle.min.js");
}, []);
```
usa `require()`, que o ESLint do projeto rejeita
(`@typescript-eslint/no-require-imports`). Não quebra o build, mas quebra
`npm run lint` — se o CI rodar lint como gate, isso falha o pipeline.
Trocar por:
```tsx
useEffect(() => {
  import("bootstrap/dist/js/bootstrap.bundle.min.js");
}, []);
```

---

## 3. O ponto mais importante: o filtro de "Device" precisa deixar de ser fixo

Em `app/(analytics)/filtros/page.tsx`, o dropdown de Device hoje é:

```tsx
const [device, setDevice] = useState('Slow-end');
...
<select className="form-select" value={device} onChange={(e) => setDevice(e.target.value)}>
  <option value="Slow-end">Slow-end</option>
  <option value="Mid-end">Mid-end</option>
  <option value="High-end">High-end</option>
</select>
```

Esses três valores (`Slow-end`/`Mid-end`/`High-end`) eram um conceito de
**tier fixo de dispositivo** que **foi removido da API há duas versões**.
Hoje `device` é uma string livre — o identificador real do aparelho
físico usado no experimento (ex: `"SM-S908E"`, `"2312CRNCCL"`,
`"Pixel6"`). Isso está documentado formalmente em
`CONTRATO_BACKEND_NODE.md` (seção 2, já incluído neste projeto), que diz
literalmente:

> "`filters.device` está desatualizado e precisa de atenção: o dropdown
> atual do front ainda manda valores fixos (`Slow-end`/`Mid-end`/`High-end`)...
> Esse conceito não existe mais... quem for finalizar a página de filtro
> precisa trocar esse dropdown por uma lista real de devices."

**O que precisa ser feito:**

1. **Não usar mais um `<select>` com opções hardcoded** para device.
2. Decidir, junto com quem mantém o Node, uma destas duas abordagens:
   - **Opção A (recomendada):** o Node expõe um endpoint (ou o payload de
     `/api/charts` já devolve, junto dos dados) a lista de devices reais
     existentes na base, e o front popula o `<select>` dinamicamente a
     partir disso.
   - **Opção B (mínima, se não houver tempo pra Opção A agora):** remover
     o filtro de device da UI temporariamente, deixando o filtro por
     `dataset` e `experimentos` funcionando normalmente, até que a Opção A
     possa ser feita.
3. Em nenhum cenário o front deve **mandar** `"Slow-end"`/`"Mid-end"`/`"High-end"`
   pro Node como valor de filtro — esses valores não correspondem a
   nenhum dado real e o filtro simplesmente não vai encontrar nada.

Esse mesmo documento (`CONTRATO_BACKEND_NODE.md`) também é a referência
para os outros campos do filtro (`dataset` aceita `"deepweeds"`/`"weed6c"`
ou os labels já formatados) e para o formato exato que o Node deve
devolver — vale ler por completo antes de mexer em `filtros/page.tsx`,
porque a forma da resposta é o que `normalizeNodeResponseIntoMessages`
espera receber.

---

## 4. Se o formato da resposta do Node mudar

Hoje o contrato (documentado em `CONTRATO_BACKEND_NODE.md` e implementado
em `lib/dashboardData/normalizeNodeResponse.ts`) é: uma mensagem única
`{ charts, data, mobile_data? }`, ou uma lista de duas mensagens (uma
mobile + uma de predição) quando o filtro pede gráficos dos dois grupos
ao mesmo tempo.

Se essa forma mudar do lado do Node, o único lugar a ajustar é
`normalizeNodeResponseIntoMessages` — a função que traduz o que quer que
o Node mande para o formato `{ charts, data, mobile_data? }` que o resto
da engine já entende. **Não propagar esse tipo de ajuste para
`AnalyticsPayloadContext.tsx`, `useAnalyticsFeedFromFilter.ts` ou
qualquer arquivo do dashboard** — eles não sabem (e não devem saber) nada
sobre o formato originado do Node.

---

## 5. Checklist antes de abrir PR / considerar pronto

```bash
# raiz do projeto
npm install
npx tsc --noEmit      # deve voltar limpo (sem os erros do cadastro)
npm run lint           # sem erros (warnings existentes são triviais e pré-existentes)
npm run build           # next build — deve gerar as páginas estáticas normalmente

# engine, isolada — não deve ser tocada, mas confirme que nada quebrou
cd lib/analytics-engine
npm install && npm test    # tem que continuar 53/53
```

Teste manual do fluxo completo, do início ao fim:

1. Login (quando implementado) → sessão criada.
2. `/filtros` → aplicar um filtro real (dataset + experimentos, e device
   já corrigido conforme seção 3) → clicar em "Aplicar Filtros".
3. Confirmar que a navegação para `/dashboard` acontece automaticamente
   e que os gráficos aparecem **calculados a partir da resposta real do
   Node** — não mais da fixture (que deve já ter sido removida, seção 2).
4. Se o Node não tiver dado pra aquele filtro, confirmar que aparece o
   aviso de erro no `/dashboard` (via `deliveryError`/`lastError`), não
   uma tela quebrada.

---

## Resumo — o que muda e o que não muda

| | Pode mexer | Não pode mexer |
|---|---|---|
| **Login / Cadastro / Recuperar senha** | Tudo — implementar/corrigir livremente | — |
| **Filtro** | JSX/UX do formulário, `useState` dos campos, lista de devices (seção 3), lista de experimentos | O trecho final de `fetchCharts` (fetch → normalize → `deliverPayload` → `router.push`) |
| **Dashboard** | — | Nada — página pronta, só consome o Context |
| **Engine (`lib/analytics-engine`)** | — | Nada — validada, protegida por 53 testes |
| **Handoff (`AnalyticsPayloadContext`, `useAnalyticsFeedFromFilter`)** | — | Nada — mecanismo já resolvido |
