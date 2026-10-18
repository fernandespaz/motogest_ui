# Estudo de ponta a ponta — módulo Financeiro

Objetivo: tornar o Financeiro uma ferramenta de gestão do dinheiro, que mostre **de onde o dinheiro vem e onde ele é aplicado**, sem complexidade. Este documento mapeia o que existe (UI + `motogest_api`), os gaps do cadastro de contas até os relatórios, e propõe o modelo, as mudanças de backend e a ordem de entrega.

> Base do levantamento: `openapi.json` ao vivo, código do `motogest_api` (branch `feature/checkin_entrada`, migrações até `V34`) e a UI atual. Dados de teste do ambiente local (3 contas a pagar, 5 a receber, 1 caixa).

## 1. Como funciona hoje

```
Cadastrar conta ──► Vence ──► Baixa (pagar/receber) ──► Movimento de caixa ──► Relatório de caixa
  (4 campos)       (só data)   (sem forma/data)         (sem sessão)           (só entradas/saídas)
```

| Etapa | O que existe | Observação |
|---|---|---|
| Conta a pagar | descrição, fornecedor (texto), valor, vencimento | `ContaPagar` não tem mais nada |
| Conta a receber | descrição, cliente, OS, valor, vencimento | quase todas nascem do faturamento de OS |
| Situação | PENDENTE, PAGO/RECEBIDO, CANCELADO | **`ATRASADO` existe no enum mas nada o grava** |
| Baixa | `POST /{id}/pagar` (sem corpo) | data = hoje, sem forma de pagamento, sem valor pago |
| Caixa | sessões (turnos), divergência, histórico de abertura/fechamento/reabertura | auditoria só por sessão |
| Relatórios | caixa diário e por período, PDF/XLSX | nada de contas, categorias ou fechamento |
| Dashboard | contas pendentes (soma), saldo do mês civil | não separa vencidas, não compara meses |

## 2. Gaps encontrados

### Cadastro de contas
- **Sem categoria.** É impossível responder "quanto gastei com aluguel / peças / salários". A única "categoria" existente é a do caixa (`VENDA_OS`, `PAGAMENTO_CONTA`, `RECEBIMENTO_CONTA`, `OUTRO`), que diz *como* o dinheiro se moveu, não *onde* foi aplicado.
- **Sem despesa fixa/recorrente.** Aluguel, energia e salários são recadastrados à mão todo mês.
- **Fornecedor em texto livre.** "Auto Peças Veloz" e "Autopeças Veloz" viram dois fornecedores num relatório.
- **Sem parcelamento**, número do documento, observação ou anexo.
- **Compra de estoque não gera conta a pagar** (`ContaPagar` só é criada pelo próprio cadastro): o maior gasto de uma oficina, peças, fica fora do financeiro.

### Ciclo da conta
- **Vencida é derivada**, nunca gravada: `ATRASADO` não é atribuído por nenhum código. A UI já trata (pendente com data passada = vencida), mas `GET /dashboard` soma vencidas e a vencer juntas em "pendentes".
- **Só conta PENDENTE pode ser editada, paga ou cancelada**, e não há estorno: uma baixa por engano não tem como ser desfeita.
- **Baixa sem informação:** a data de pagamento é sempre hoje, não há forma de pagamento, nem valor efetivamente pago (juros, multa, desconto).

### Baixa × caixa (risco de auditoria)
- `registrarAutomatico` grava o movimento de caixa da baixa **sem sessão e sem forma de pagamento**. O dinheiro some da auditoria do turno e o "saldo por forma de pagamento" do caixa não fecha com o que foi pago de fato.

### Fechamento ("data muro")
- **Não existe.** Nada impede criar, editar ou baixar lançamentos num mês já conferido. Não há dia de fechamento configurável, período contábil, fechamento com snapshot do balanço, nem reabertura com motivo.

### Visão gerencial
- O dashboard usa o **mês civil** (dia 1 ao último). Empresas que fecham no dia 20 olham o período errado.
- Sem resultado do mês (receitas − despesas), sem comparação com o mês anterior, sem ranking de gastos.

### Relatórios
- Só caixa. Faltam: despesas por categoria, receitas por origem, contas por vencimento/fornecedor/cliente, inadimplência, fluxo previsto × realizado e o **fechamento mensal**.

### Permissões
- `FINANCEIRO_READ`, `FINANCEIRO_WRITE`, `CAIXA_*`. Falta uma permissão para **fechar/reabrir período** (ação sensível).

## 3. Proposta

### 3.1 Categorias financeiras
Cadastro simples por oficina, com padrão já semeado (editável):

| Tipo | Exemplos |
|---|---|
| Despesa **fixa** | Aluguel, Energia, Água, Internet, Salários, Contador, Sistema/Software |
| Despesa **variável** | Peças e insumos, Ferramentas, Combustível, Manutenção, Marketing |
| Impostos e taxas | Impostos, Taxas de cartão, Tarifas bancárias |
| Receita | Serviços (OS), Venda de peças, Outras receitas |

Cada categoria tem `tipo` (DESPESA/RECEITA), `fixa` (sim/não), nome e `ativo`. A conta passa a ter `categoria` obrigatória nos lançamentos novos (legado fica "Sem categoria" e aparece como pendência de classificação).

### 3.2 Cadastro de conta melhorado
- Categoria, observação, número do documento, forma de pagamento prevista (opcional).
- **"Repetir todo mês"** (fixas) e **"Parcelar em N vezes"**: gera o lote de contas de uma vez, ligadas por um `grupo` (sem job agendado). Editar/cancelar "esta" ou "esta e as próximas".
- Fornecedor continua texto, com **autocompletar dos já usados** (evita variações sem criar um cadastro novo).

### 3.3 Baixa completa
`POST /{id}/pagar` passa a aceitar (opcional): `dataPagamento`, `formaPagamento`, `valorPago`, `observacao`. Sem corpo continua funcionando (hoje, valor da conta). O movimento de caixa gerado leva a forma de pagamento, o valor efetivo e a data real, **mas continua sem sessão de caixa** — decisão original do backend (a baixa é um evento do ledger financeiro, não do caixa físico do turno), mantida ao ler o código. **Estorno** de baixa (com motivo e auditoria) enquanto o período não estiver fechado — ainda não entregue.

### 3.4 Fechamento mensal — a "data muro"
- Parâmetro da oficina: **dia de fechamento** (1–31; padrão 20). O período financeiro vai do dia seguinte ao fechamento do mês anterior até o dia de fechamento (ex.: 21/set → 20/out).
- **Fechar período** gera um snapshot: receitas, despesas, resultado, saldo de caixa e total por categoria; registra quem fechou e quando.
- Período fechado **trava** criar, editar, baixar, estornar e cancelar lançamentos cuja competência caia nele (erro 422 claro). **Reabrir** exige motivo e fica na auditoria.
- Antes de fechar, um **checklist de pendências** (contas vencidas do período, caixa aberto, caixas com divergência sem justificativa, contas sem categoria).
- Competência = **data de vencimento** da conta; a baixa de uma conta de período fechado também é bloqueada.

### 3.5 Visão geral mensal
- Seletor de período ‹ out/2026 (21/set–20/out) › com a situação (Aberto / Fechado).
- **Balanço do período:** receitas realizadas, despesas pagas, resultado, previsto × realizado.
- **Onde o dinheiro foi aplicado:** rosca por categoria + ranking com % do total e variação sobre o mês anterior; fixas × variáveis; maiores fornecedores.
- Faixa de contagem regressiva: "faltam 2 dias para o fechamento — 3 pendências" e botão **Fechar mês**.
- Mantém o que a Parte 1 já entrega (vencidas, a vencer, aviso ao entrar).

### 3.6 Caixa e auditoria
- **Caixas:** todas as sessões que tiveram movimento, filtráveis por período/status/operador, com os lançamentos de cada uma.
- **Auditoria consolidada:** divergências por caixa, reaberturas com motivo, movimentos sem sessão (baixas de contas), total de divergência no período.

### 3.7 Relatórios (PDF e Excel)
Fechamento mensal · Despesas por categoria · Receitas por origem · Contas por vencimento (a pagar/receber) · Inadimplência por cliente · Fluxo de caixa previsto × realizado · (já existentes) Caixa diário e por período. A geração segue o padrão de `CaixaExportService`.

## 4. Mudanças no backend (`motogest_api`)

Seguindo o `CLAUDE.md` do projeto: migrações novas (nunca editar as aplicadas), isolamento por tenant com FK composta, DTOs `record`, `@PreAuthorize`, testes e documentação.

| Item | Mudança |
|---|---|
| `V35` categorias | tabela `categoria_financeira` (`tenant_id`, nome, tipo, fixa, ativo) + seed por oficina existente; `OficinaService.registrar` semeia nas novas |
| `V35` contas | `conta_pagar` / `conta_receber`: `categoria_id` (FK composta), `observacao`, `documento`, `forma_pagamento`, `valor_pago`, `grupo_id`, `parcela_numero`, `parcela_total` |
| `V36` fechamento | `parametro_financeiro` (`dia_fechamento`), `fechamento_financeiro` (+ `fechamento_financeiro_evento` para abertura/fechamento/reabertura) |
| Endpoints novos | `/categorias-financeiras` (CRUD) · `/financeiro/parametros` · `/financeiro/fechamentos` (listar, período atual, fechar, reabrir) · `/financeiro/resumo?inicio&fim` (balanço + por categoria) · `/financeiro/relatorios/*` (+ exportação) |
| Endpoints alterados | contas (campos novos, criação em lote), `…/pagar` e `…/receber` (corpo opcional), `…/estornar` |
| Regras | bloqueio por período fechado nos serviços de conta e caixa; baixa grava forma de pagamento no movimento |
| Permissão | `FINANCEIRO_FECHAR` (migração de dados para perfis Administrador existentes, conforme o checklist de novo módulo) |
| Dashboard | usar o período de fechamento; separar vencidas de a vencer |
| Testes/docs | testes de service, `TenantIsolationArchitectureTest` (novos repositórios), README (endpoints) e `.agente/` |

## 5. Ordem de entrega

| Fase | Entrega | Valor |
|---|---|---|
| **0** (feita) | Visão geral, A pagar/A receber com situação de vencimento, aviso de vencidas | Controle do que vence |
| **1** (feita) | Categorias + cadastro melhorado (recorrência/parcelas) + baixa completa + dia de fechamento | Dado certo na origem |
| **2** | Visão geral mensal (período de fechamento, balanço, onde o dinheiro foi) | Gestão |
| **3** | Fechamento/reabertura, bloqueio e checklist | Data muro |
| **4** | Caixas, auditoria consolidada, relatórios e exportação | Conferência |
| **5** (opcional) | Compra de estoque gera conta a pagar; anexos | Fecha o ciclo |

## 6. Decisões com recomendação
1. **Competência do fechamento:** data de vencimento *(recomendado)* ou data de pagamento.
2. **Fechar com pendências:** permitir com aviso *(recomendado)* ou bloquear.
3. **Despesas fixas:** "repetir por N meses" ao cadastrar, sem job *(recomendado)*, ou modelo com geração automática mensal.

## 7. Fase 1 — o que foi entregue

**Backend (`motogest_api`, migração `V35`)**
- `categoria_financeira` (despesa/receita, fixa, ativa) com 18 categorias padrão para cada oficina — semeadas pela migração nas existentes e por `OficinaService.registrar` nas novas. Sem exclusão; o tipo não muda.
- Contas ganharam `categoria`, `observacao`, `documento`, `forma_pagamento`, `valor_pago`, `grupo_id` e `parcela_numero/total`. `categoriaId` é opcional na API (o faturamento de OS gera o recebível já com a receita "Serviços (OS)"); a tela exige.
- `POST /contas-pagar|receber/lote`: repetir todo mês ou parcelar (2–60), sem job agendado.
- `POST …/pagar|receber` com corpo opcional (`data` não futura, `formaPagamento`, `valorEfetivo`). Sem corpo, comportamento antigo.
- `GET/PUT /financeiro/parametros`: dia de fechamento (1–31, padrão 20).
- Testes: unitários, integração REST com H2 e um teste que aplica a V35 sobre uma base com oficinas e contas reais.

**Frontend**
- Cadastro de conta com categoria (fixas × variáveis), nº do documento, observação e frequência (única, todo mês, parcelada) com prévia das datas e valores.
- Baixa com data, forma de pagamento e valor efetivo (avisa juros/multa ou desconto).
- Lista de contas com coluna e filtro de categoria, "Sem categoria" em destaque e indicador de parcela.
- Aba **Ajustes**: dia de fechamento (com o período atual) e gestão das categorias.

**Observações para as próximas fases**
- Contas antigas ficam "sem categoria" até alguém classificá-las; editar uma delas exige escolher a categoria.
- O dia de fechamento já é gravado e exibido, mas ainda não bloqueia nada (Fase 3).
