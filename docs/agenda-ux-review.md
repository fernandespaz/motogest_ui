# Revisão UX — Agenda

Base: `AgendaPage`, `AgendaCalendario`, `AgendaKanban`, `AgendaCard`, `AgendamentoDetalheModal`, `agendaUtils` e a
tela rodando em 1440×900 (Administrador, dados de teste): visões Mês, Semana, aba Quadro (Kanban) e o modal
"Novo agendamento". Não vi a visão Dia, o modal de detalhe nem o celular (só código).

## Etapa 1 — Análise crítica

### O que a agenda precisa responder
"Quem chega hoje e a que horas? Tenho espaço para encaixar mais um? O que está atrasado/sem resposta?" Hoje a tela é
um calendário genérico que responde "o que existe neste mês", com pouca ajuda para decidir.

### Problemas de usabilidade e fluxo
1. **Visão Mês: o que importa fica fora da tela.** Células altas (`min-h` 8,5 rem) e semanas passadas vazias ocupam a
   primeira dobra; no print, "hoje" (dia 26) aparece na **última linha visível, cortado**. Abre-se a agenda e é preciso
   rolar para ver o dia atual. 🟠
2. **A barra de "carga do dia" usa uma capacidade fixa de 8 serviços** (`CAPACIDADE_DIA = 8`, "referência"), ignorando a
   tela **Capacidade Produtiva** (mecânicos × horas/dia × eficiência) que a oficina já configurou. Hoje (13
   agendamentos) aparece vermelho; amanhã (5) âmbar, mas o sinal não reflete a capacidade real. Informação que parece
   confiável e não é. 🟠
3. **Visão Semana: sete colunas de cards espremidas.** No print, a hora fica no canto direito e **estoura a borda do
   card** ("10:00" cortado), nomes de cliente truncados ("Fernanda …", "Patricia G…"), 4–5 linhas de texto por card.
   Sem eixo de horas, é impossível ver **buracos, sobreposição ou o horário livre** para encaixar um cliente. 🔴
4. **Visão Dia: uma coluna única de cards** — desperdiça a largura da tela e também não é uma linha do tempo. 🟡
5. **Quadro (Kanban) mistura dois conceitos**: "Agendado (26)" é carro que **ainda não chegou**; as outras colunas são o
   **pátio** (OS do técnico). Janela fixa de 14 dias atrás + 30 à frente; "Agendado" mostra de hoje até semanas depois,
   e "Concluído" traz itens de 3 semanas. Um agendamento **atrasado** (horário passou, ainda "Agendado" = possível
   no-show) não é sinalizado. 🟠
6. **Ruído nos cards**: "Sem mecânico definido" e "Sem orçamento" (âmbar) aparecem na maioria dos cards; quando tudo
   é alerta, nada é alerta. 🟡
7. **Filtros sempre ocupam uma linha inteira** (busca + status + mecânico + "Limpar" desabilitado). "Mecânico (sem OS)"
   desabilitado confunde. O status tem 7 opções num select; chips seriam 1 clique. 🟡
8. **Cada troca de período troca tudo por um spinner** (visto ao abrir Semana): o layout "pula" e perde-se a
   referência. 🟡
9. **Criar a partir do mês exige dois passos** (clicar no dia → visão Dia → "+"); o "+" só existe nas visões
   semana/dia. 🟡

### Formulário "Novo agendamento"
10. Estrutura boa (cliente → veículo → data/hora com "Hoje/Amanhã" → serviços). Faltas: **horário é um campo livre**,
    sem mostrar o que já está marcado/carga do dia; o painel de serviços vazio ocupa metade do modal ("Escolha o
    veículo…"); **"Criar orçamento" e "Salvar"** disputam atenção sem explicar a diferença. 🟡

### Modal de detalhe
11. Bom: mostra status, etapa e o **próximo passo** do fluxo agendamento → orçamento → OS. Falta o óbvio da recepção:
    **ligar/WhatsApp para confirmar** e um **"cliente chegou"**; o texto explicativo longo no rodapé do modal ocupa
    espaço fixo. 🟡

### Acessibilidade
12. Pontos bons: cada dia/card é `<button>` com rótulo, a barra de carga tem `role=img` + texto. Pontos fracos: grade do
    mês sem semântica de tabela/grid; cor é o único indicador de atrasado/cancelado nos chips do mês; alvos pequenos nos
    chips (≈20 px). 🟢

## Etapa 2 — Score UX

| Critério | Nota |
|---|---|
| Clareza | 6,0 |
| Usabilidade | 5,0 |
| Acessibilidade | 6,5 |
| Arquitetura da informação | 5,5 |
| Hierarquia visual | 5,0 |
| Eficiência operacional | 5,0 |
| Experiência do usuário | 5,3 |
| **Geral** | **5,5 / 10** |

## Etapa 3 — Severidade
1. 🔴 Semana sem eixo de horas, hora cortada, cards espremidos (#3)
2. 🟠 Mês com hoje fora da dobra (#1) · 🟠 carga com capacidade fixa e enganosa (#2) · 🟠 Kanban mistura "a chegar" com pátio e não marca atrasados (#5)
3. 🟡 Dia sem linha do tempo (#4) · ruído nos cards (#6) · filtros (#7) · spinner total (#8) · criar pelo mês (#9) · formulário (#10) · detalhe (#11)
4. 🟢 Semântica/alvos (#12)

## Etapa 4 — Veredito
Manter o modelo (calendário + quadro + fluxo agendamento→orçamento→OS, que é bom). **Redesenhar a visualização por
tempo**: hoje nenhuma visão mostra horas. Proposta: o dia como **linha do tempo**, o mês como **visão geral compacta
com painel lateral do dia**, e o quadro focado no **pátio**.

## Etapa 5 — Nova experiência
1. **Abrir em "Hoje"** (visão Dia como padrão), com **linha do tempo 07h–19h**: cada agendamento ocupa seu horário, o
   "agora" é uma linha, atrasados ficam em âmbar com "atrasado 25 min", horários livres aparecem como "+ encaixar".
2. **Semana**: grade horas × dias compacta (só placa + hora + ícone de status); detalhes no clique/hover, não no card.
3. **Mês**: células baixas (heatmap de carga) **+ painel lateral** com a lista do dia selecionado (clicar não troca de
   visão). O dia de hoje sempre visível.
4. **Carga real**: usar a **Capacidade Produtiva** configurada (horas disponíveis do dia × horas vendidas dos serviços
   agendados) em vez de "8 por dia"; mostrar "6h de 9h".
5. **Quadro**: separar **"A chegar hoje"** (agendamentos) de **Pátio** (Na fila → Concluído); janela padrão
   "hoje" com opção de ampliar; marcar atrasados.
6. **Cards enxutos**: placa, hora, cliente (sem truncar), 1 serviço + "+2"; alertas só quando relevantes ("sem
   orçamento" apenas para os do dia, ícone em vez de texto).
7. **Filtros**: busca sempre visível; status e mecânico em um popover "Filtros (2)" com chips ativos removíveis.
8. **Navegação sem perder o lugar**: manter o calendário e usar skeleton/opacidade ao trocar de período.
9. **Formulário**: mostrar, ao escolher a data, os horários já ocupados e a carga do dia; "Salvar" como ação única e
   "Salvar e criar orçamento" como secundária claramente rotulada.
10. **Detalhe**: botões "WhatsApp" e "Ligar" ao lado do cliente; "Cliente chegou" quando for hoje.

**Benefícios:** recepção decide em segundos se cabe mais um carro e a que horas; menos no-show não percebido;
sinal de carga confiável. **Negócio:** mais encaixes por dia, menos buracos na agenda, menos faltas. **Atrito:** de
"abrir mês, rolar, abrir dia, ler cards" para "abrir e ver o dia".

## Etapa 6 — Wireframe

```
Agenda            [Calendário | Quadro]           🔎 buscar…   [Filtros (0)]   [ + Novo agendamento ]
‹  Hoje  ›   Quinta, 26 de novembro        [ Dia | Semana | Mês ]        Carga: 6h de 9h ▓▓▓▓▓▓░░░
┌──────────────┬─────────────────────────────────────────────────────────────────────────────┐
│ novembro     │ 07h ─ ░ 07:00 AGD1A09 · Marcelo B. · TBI                    ✔ Concluído      │
│ D S T Q Q S S│ 08h ─ ░ 08:00 MTG0002 · Fernanda S. · Revisão               ○ Agendado       │
│ ··············│       ░ 08:00 AGD1A01 · Carlos E. · Óleo+Filtro   ← sobreposição (2 no horário)│
│ ▒ ▒ ▒ [26] ▒ │ 09h ─ ░ 09:00 AGD1A02 · Fernanda S. · Troca de vela        ○ Agendado       │
│ heatmap carga│ 10h ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  + encaixar às 10:00                    │
│              │ ━━━ agora 10:42 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Hoje: 13     │ 11h ─ ⚠ 11:00 MTG0011 · Marcelo B. · TBI     atrasado 42 min  [Chamar] [Chegou]│
│ Atrasados: 1 │ …                                                                           │
└──────────────┴─────────────────────────────────────────────────────────────────────────────┘
```

## Etapa 7 — Design system
Reutiliza `PageHeader`, `Tabs`, `Badge`, `Button`, `SegmentedControl` (visões Dia/Semana/Mês), `Modal` (agora
acessível), `Card`, `EmptyState` e os tokens de status (`faixaStatus`). Novos com ganho real: `LinhaDoTempoDia`
(eixo de horas), mini-mês com heatmap, `PopoverFiltros`. Nada de nova paleta.

## Etapa 8 — Microinterações
Skeleton ao trocar de período (sem spinner total) · linha "agora" atualizando a cada minuto · foco no dia de hoje ao
abrir · toast com "Desfazer" ao cancelar · estado vazio do dia ("Dia livre — encaixar um carro?") · confirmação ao
cancelar agendamento (hoje é um clique).

## Etapa 9 — Acessibilidade
Mês como `role="grid"` com setas ←↑→↓ entre dias · atrasado/cancelado com ícone + texto, não só cor · alvos ≥ 44 px
nos itens · horários com `<time datetime>` · anúncio `aria-live` ao mudar de período.

## Etapa 10 — Resultado final

| | Antes | Depois (estimado) |
|---|---|---|
| Ver horários livres do dia | impossível | direto na linha do tempo |
| Rolagens para ver "hoje" no mês | 1–2 | 0 |
| Carga do dia | fixa (8/dia), enganosa | real (Capacidade Produtiva) |
| Atrasados sinalizados | não | sim |
| Score UX | **5,5** | **8,4** |

**Ordem sugerida:** (1) abrir em Hoje/Dia com linha do tempo e "agora"; (2) carga real via Capacidade Produtiva;
(3) marcador de atrasados + Kanban "A chegar" × Pátio; (4) mês compacto + painel do dia; (5) cards e filtros
enxutos; (6) formulário com horários ocupados; (7) WhatsApp/Ligar no detalhe.

**A verificar antes de implementar**
- Como a **Capacidade Produtiva** é calculada e se há endpoint de horas disponíveis por dia (para a carga real).
- Se `Agendamento` tem **duração/horário de fim**; sem isso a linha do tempo só pode marcar o início.
- Se o backend aceita buscar só o dia (hoje a tela busca o período visível).

Nada foi alterado em `src/` por esta revisão.
