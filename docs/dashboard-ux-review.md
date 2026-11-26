# Revisão UX — Dashboard

Base: `DashboardPage.tsx` (painel geral, Administrador), `DashboardConsultor.tsx`, `StatCard`, `DonutChart`,
`useDashboard`, `useDashboardAdmin`, e a tela rodando em 1440×900 (tema escuro, Administrador, dados de teste).
Não vi o painel do Consultor rodando (só código) nem o dashboard no celular.

## Etapa 1 — Análise crítica

### O que a tela deveria responder
"O que precisa da minha atenção agora, e como está o dia?" Hoje ela responde só a segunda parte: é um **panorama
descritivo**, não uma lista de ações.

### Problemas de confiança nos números (os mais graves)
1. **Os mesmos conceitos aparecem com valores diferentes na mesma tela.** No print: cartão "OS abertas **2**" × rosca
   "Abertas / aguardando cliente **4**"; cartão "OS em andamento **10**" × rosca "Em execução **23**". Causa no código:
   os cartões vêm de `GET /dashboard`; a rosca é calculada no navegador (`resumirFunilOs`) com **definições diferentes**
   ("Em execução" soma Aprovada + Em andamento + Aguardando peça + Pausada) e sobre **só as 100 OS mais recentes**
   (`PAGINA_RECENTE`). O dono lê dois números para "a mesma coisa" e não sabe qual vale. 🔴
2. A rosca de OS pode **subcontar** numa oficina com mais de 100 OS vivas, sem nenhum aviso. 🟠

### Problemas de função (o painel não leva a lugar nenhum)
3. **Nada que exija ação se destaca.** "Prontas para faturar 10" é dinheiro parado e é só uma linha de legenda.
   "Produtos abaixo do mínimo 0" tem o mesmo peso visual que "Agendamentos hoje 14". 🔴
4. **A rosca e a legenda não são clicáveis**, embora a lista de OS já tenha filtro por status. Quem vê "10 prontas
   para faturar" precisa ir ao menu, abrir OS e filtrar. 🟠
5. **Orçamentos não existem no painel geral** (o do consultor tem). Para o dono, orçamentos enviados sem resposta e
   aprovados sem OS são receita em risco. 🟠
6. **Financeiro só mostra o futuro "pendente"**: não mostra **contas vencidas** (a informação acionável; o app já tem
   um diálogo de vencidas em outro lugar) nem comparação com o mês anterior. 🟠
7. **A agenda trata passado e futuro igual**: o item das 07:00 "Concluído" abre a lista na frente do que ainda vai
   chegar; sem destaque para "próximo" nem para atrasados. Todos os itens levam a `/agenda` genérico, não ao
   agendamento. 🟡

### Problemas visuais / cognitivos
8. **Quatro cartões de mesmo peso** + três cartões grandes = sete blocos competindo; os cartões repetem o que a rosca
   de OS já mostra. 🟡
9. **A rosca de Financeiro mistura conceitos**: o centro mostra "Resultado previsto R$ 1.650" (a receber − a pagar),
   mas o anel mostra as duas partes lado a lado (2.400 vs 750). O resultado não é uma "fatia"; uma barra
   receber × pagar com o saldo ao lado comunica melhor. 🟡
10. **Rótulos truncados** ("Produtos abaixo do m…", nomes de clientes na agenda). 🟢
11. **Painel do Consultor**: 8 cartões + grade de indicadores + 7 listas, cartões e listas repetem as mesmas
    contagens (cada lista já tem contador no título). Longo e redundante. 🟡

### Problemas técnicos que afetam a experiência
12. **Falha na API = carregando para sempre**: `if (isLoading || !data) return <PageSpinner/>` e `useDashboard` não
    trata erro. Se `/dashboard` falhar, o usuário vê o spinner indefinidamente, sem mensagem nem "tentar de novo". 🔴
13. `StatCard` clicável é um `div role="button"` que **navega** — semanticamente deveria ser link (abrir em nova aba,
    leitor de tela anuncia "link"). 🟡
14. Sem skeleton: a página inteira vira spinner até o primeiro dado. 🟢

## Etapa 2 — Score UX

| Critério | Nota |
|---|---|
| Clareza | 5,5 (números conflitantes) |
| Usabilidade | 5,0 |
| Acessibilidade | 6,5 (rosca tem `aria-label` e legenda; cartão-link como botão) |
| Arquitetura da informação | 5,0 |
| Hierarquia visual | 5,0 |
| Eficiência operacional | 4,5 |
| Experiência do usuário | 5,0 |
| **Geral** | **5,2 / 10** |

## Etapa 3 — Severidade (por impacto)
1. 🔴 Números diferentes para o mesmo conceito (#1) 2. 🔴 Spinner infinito em erro (#12) 3. 🔴 Nada que exige ação se destaca (#3)
4. 🟠 Rosca/legenda não navegam (#4) 5. 🟠 Sem orçamentos para o dono (#5) 6. 🟠 Sem vencidas (#6) 7. 🟠 Funil pode subcontar (#2)
8. 🟡 Agenda sem "próximo" (#7), cartões redundantes (#8), rosca financeira (#9), Consultor longo (#11), cartão-link (#13)
9. 🟢 Truncamentos (#10), skeleton (#14)

## Etapa 4 — Veredito
Manter a **estrutura de três blocos** (OS · Financeiro · Agenda), mas **reorganizar a hierarquia**: primeiro "precisa
de atenção", depois o panorama. E **uma única fonte para cada número**. Não é preciso substituir a tela; é redesenho de
prioridade e de dados.

## Etapa 5 — Nova experiência
1. **Faixa "Precisa de atenção agora"** no topo, só com o que tem ação (some quando zero): OS prontas para faturar
   (nº e valor), orçamentos enviados sem resposta há 3+ dias, contas vencidas, produtos abaixo do mínimo, chegadas
   atrasadas da agenda. Cada item é um link já filtrado.
2. **Uma definição por número.** Cartões e rosca passam a usar a mesma fonte e os mesmos rótulos; a rosca vira
   legenda clicável (cada status leva a `/ordens-servico?status=…`). Se o funil não cobrir todas as OS, mostrar "últimas 100".
3. **KPIs com contexto**: 3 cartões (OS ativas, Agendamentos hoje, Orçamentos em aberto) com variação vs ontem/mês
   passado; "Produtos abaixo do mínimo" só aparece como alerta quando > 0.
4. **Financeiro**: barra a receber × a pagar, **vencidas em destaque**, saldo de caixa; sem rosca.
5. **Agenda**: "Próximo: 08:00 Juliana" em destaque, concluídos esmaecidos/recolhidos, atrasados em âmbar; cada item
   abre o próprio agendamento.
6. **Estados**: skeleton por bloco; erro por bloco com "Tentar novamente" (um bloco falhar não derruba o painel).

**Benefícios ao usuário:** sabe em 5 segundos o que fazer; números batem. **Ao negócio:** menos OS paradas sem fatura,
menos orçamento esquecido, caixa visível. **Atrito:** de "ler três blocos e navegar pelo menu" para "um clique na tela
já filtrada".

## Etapa 6 — Wireframe (desktop)

```
Olá, Diego · Quinta, 26 de novembro                                   [ + Novo orçamento ]
┌ PRECISA DE ATENÇÃO AGORA ──────────────────────────────────────────────────────────────┐
│ ⚠ 10 OS prontas p/ faturar → │ ⚠ 3 orçamentos sem resposta há 3+ dias → │ ⚠ 2 contas vencidas → │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌ OS ativas 49 ┐ ┌ Agendamentos hoje 14 ┐ ┌ Orçamentos em aberto 7 ┐
└──────────────┘ └──────────────────────┘ └────────────────────────┘
┌ Ordens de serviço ───────────┐ ┌ Financeiro ─────────────────┐ ┌ Agenda de hoje ─────────┐
│ Abertas / aguardando    4  → │ │ A receber  R$ 2.400 ██████  │ │ Próximo  08:00 Juliana  │
│ Em execução            23  → │ │ A pagar    R$   750 ██      │ │ 08:00 Carlos E.  ●      │
│ Prontas p/ faturar     10  → │ │ Vencidas   R$   0           │ │ 09:00 Bruno H.          │
│ Prontas p/ entrega     12  → │ │ Saldo do mês  R$ 1.459,90   │ │ ░ 07:00 Marcelo (conc.) │
└──────────────────────────────┘ └─────────────────────────────┘ └─────────────────────────┘
```

## Etapa 7 — Design system
Reutiliza `PageHeader`, `Card/CardHeader`, `StatCard`, `Badge`, `buttonStyles`, tokens `brand/warning/danger`. Novos
(com ganho real): `FaixaAtencao` (lista de alertas-link), barra horizontal simples para receber × pagar (substitui o
`DonutChart` no Financeiro; o donut de OS pode ficar, com legenda clicável).

## Etapa 8 — Microinterações
Skeleton por bloco · erro por bloco com "Tentar novamente" · contagem que anima ao mudar (já há fade) · foco visível nos
links · item da agenda "agora/próximo" com marcador · estado vazio positivo ("Nada pendente — tudo em dia").

## Etapa 9 — Acessibilidade
Cartões que navegam como `<a>`; faixa de atenção com `role="region"` + título; cor nunca sozinha (já há legenda
textual — manter); anunciar atualização do total com `aria-live` só quando o dado recarregar; medir contraste do
`ink-muted` pequeno (não medi); alvos ≥ 44 px nos itens da agenda (hoje ~48 px, ok).

## Etapa 10 — Resultado final

| | Antes | Depois (estimado) |
|---|---|---|
| Números conflitantes na tela | 2 pares | 0 |
| Cliques até a OS "pronta p/ faturar" | menu → OS → filtro (3+) | 1 |
| Comportamento em erro da API | spinner infinito | mensagem + "Tentar de novo" |
| Score UX | **5,2** | **8,3** |

**Ordem sugerida:** (1) tratar erro/skeleton do `useDashboard` — correção pequena e sem risco; (2) unificar a definição
dos números e tornar a legenda da rosca clicável (precisa decidir a regra: ver abaixo); (3) faixa "Precisa de atenção";
(4) Financeiro com vencidas; (5) agenda com "próximo"; (6) enxugar o painel do Consultor.

**Decisões / a verificar antes de implementar**
- Qual é a definição oficial de "em andamento" (só `EM_ANDAMENTO` ou o grupo "em execução")? Os cartões vêm do backend:
  confirmar no `/v3/api-docs` o que `ordensServicoAbertas`/`ordensServicoEmAndamento` contam.
- O backend expõe contas **vencidas** e valor das OS por etapa? Se não, o funil continua calculado no cliente.
- `/ordens-servico` aceita `?status=` na URL ou só estado interno? (a lista já filtra por status em estado local).

Nada foi alterado em `src/` por esta revisão.
