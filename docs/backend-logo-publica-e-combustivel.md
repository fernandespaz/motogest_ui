# Backend: logo no link público e combustível no orçamento

Contexto: o front (branch `feature/logo-aprovacao-e-combustivel`) já está pronto para as duas
funcionalidades abaixo, mas depende de campos que **não existem hoje** na spec ao vivo
(`GET /v3/api-docs`, conferida em 04/10/2026). Sem eles, a logo cai num monograma e o nível de
combustível não é salvo.

## 1. Logo da oficina na página pública de aprovação do orçamento

**Problema:** o cliente abre o link `/orcamentos/publico/{token}` (sem login) e não vê a logo da
oficina, só um monograma com a inicial. `OrcamentoPublicoResponse` só traz `oficinaNomeFantasia`, e
`GET /api/v1/oficinas/atual/logo` exige JWT de staff.

**Pedido:** em `GET /api/v1/public/orcamentos/{token}` (e, nas respostas de
`POST .../aprovar` e `POST .../rejeitar`, se usarem o mesmo DTO), adicionar:

| Campo | Tipo | Regra |
|---|---|---|
| `logoBase64` | string \| null | Data URL completo, ex.: `data:image/png;base64,iVBOR...` |

- Usar a mesma logo cadastrada em Minha Oficina, da oficina dona do orçamento (resolvida pelo token,
  nunca por parâmetro do cliente).
- `null` (sem erro) quando a oficina não tem logo.
- Redimensionar no servidor (sugestão: máx. 400px no lado maior, PNG/JPEG), pois vai dentro do JSON
  e o front não reduz a imagem.
- Mesma ideia, se desejado, para `OrdemServicoPublicoResponse` (a tela de aprovação da OS ainda não
  foi alterada no front).

**Critério de aceite:** orçamento de oficina com logo → `logoBase64` preenchido; sem logo → `null`;
a página pública exibe a logo no lugar do monograma.

## 2. Nível de combustível no orçamento

**Necessidade:** o consultor informa quanto combustível o veículo tem na entrada, por um
marcador clicável (E · 1/4 · 1/2 · 3/4 · F). A informação deve sair no orçamento impresso, na OS
impressa e no recibo de pagamento.

**Pedido:** adicionar em `OrcamentoRequest` e `OrcamentoResponse`:

| Campo | Tipo | Regra |
|---|---|---|
| `nivelCombustivel` | integer, opcional/nullable | Apenas `0`, `25`, `50`, `75` ou `100` (% do tanque). Validar e rejeitar outros valores com 400. |

- Persistir no create e no update (cuidado: já houve campo presente no DTO mas descartado pela
  persistência. Precisa **ida e volta**: salvar, buscar de novo e vir igual).
- Omitido no update = manter o valor atual, como já ocorre com `dataEntradaVeiculo`.
- Migração: coluna nullable, sem backfill (orçamentos antigos ficam sem nível).

**Fluxo da OS/recibo:** hoje o front lê o nível do orçamento de origem (`OrdemServicoResponse.orcamentoId`
→ `GET /orcamentos/{id}`), só para quem tem `ORCAMENTO_READ`. Sugestão para o time avaliar: copiar
`nivelCombustivel` para a OS na conversão orçamento → OS e expô-lo em `OrdemServicoResponse`. Assim o
Mecânico (sem `ORCAMENTO_READ`) também vê o nível impresso, e o front deixa de buscar o orçamento.
Se fizerem isso, avisar para ajustar `ordemServicoPdf.ts`.

**Critério de aceite:** criar orçamento com `nivelCombustivel: 50` → GET devolve 50; editar rascunho
trocando para 75 → GET devolve 75; valor 60 → 400.

## Depois da entrega

O front roda `npm run gen:api` com o `openapi.json` atualizado, remove as declarações manuais em
`src/api/types.ts` e valida o ciclo completo no navegador.
