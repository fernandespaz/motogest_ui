# Revisão UX — O.S. (Ordem de Serviço)

Base: `OrdensServicoPage` (lista), `OrdemServicoFormPage` (detalhe/edição), `ItemsEditor`, `statusMeta` e as telas rodando
em 1440×900 (Administrador): lista e a O.S. 000049 (status Aprovada). **Não** vi o detalhe em Em andamento/Concluída/
Faturada, as abas Checklists/Fotos, a visão do mecânico (`/minhas-os`, `MinhasOrdensServicoPage` e
`MinhaOrdemServicoDetalhePage`) nem o celular — só o código. Esses pontos ficam marcados "a validar".

## Nome: "O.S."
Faz sentido encurtar para **O.S.** (é como a oficina fala). Hoje o nome aparece de 4 formas: "Ordens de Serviço" (menu e
título), "OS" (botões, toasts), "Nova Ordem de Serviço" e, no detalhe, **"OS OS-000049"** (a palavra repetida porque o
número já vem com o prefixo). Proposta:

| Onde | Hoje | Proposta |
|---|---|---|
| Menu / título da lista | Ordens de Serviço | **O.S.** (subtítulo: "Ordens de serviço da oficina") |
| Título do detalhe | OS OS-000049 | **O.S. 000049** |
| Toasts/botões | "OS enviada…", "OS pausada." | **O.S.** (um padrão só) |
| Documentos (PDF, página pública do cliente) | Ordem de Serviço | manter **por extenso** — é documento para o cliente |
| Leitores de tela | — | `<abbr title="Ordem de Serviço">O.S.</abbr>` ou `aria-label` |

Mudança de texto simples (menu em `layout/nav.ts`, `OrdensServicoPage`, `OrdemServicoFormPage`, `MinhasOrdensServicoPage`,
`FaturarOSModal`, `Pagination`); sem impacto de dados.

## Etapa 1 — Análise crítica

### Para quem é cada tela
- **Lista**: consultor/recepção querem "onde está cada carro e o que depende de mim". Mecânico usa `/minhas-os`.
- **Detalhe**: consultor acompanha, envia ao cliente, fatura e entrega; hoje também **edita tudo**.

### Lista
1. **A lista é ordenada por número, não por urgência.** O que precisa de ação hoje (Aprovada sem técnico, Pronta para
   faturar, Pronta para entrega, Tempo estourado) se mistura com histórico. 🟠
2. **Falta "previsão/prazo"**: o campo existe no detalhe ("Previsão de conclusão") mas não na lista; não há como ver o
   que está atrasado. O ícone de "tempo estourado" é minúsculo e só aparece no número. 🟠
3. **Técnico quase sempre "-"** nas Aprovadas: nada destaca "sem responsável" (que bloqueia o início — ver #8). 🟠
4. **Filtros**: 5 chips + "Mais status…" + "Técnico" + busca; o seletor de técnico quebra para uma 2ª linha. **Sem
   contagem** nos chips (o dashboard já calcula) e sem filtro "só as minhas"/"sem técnico"/"atrasadas". 🟡
5. **Linha pouco informativa**: cliente — placa, mas **sem modelo do carro**; valor e status ok; ação única "PDF" em
   botão laranja cheio (a ação mais fraca com a cor mais forte). 🟡
6. **Busca só por número** ("Buscar por número da OS"): o cliente liga dizendo placa ou nome. 🟠

### Detalhe — fluxo e riscos
7. **Seletor livre de status no topo** (Aprovada ▾) permite pular para qualquer estado (inclui **Faturado**, Concluída,
   Cancelada). O comentário no código admite que "o backend é quem valida". Num sistema com caixa e comissão, mudar
   status por dropdown sem checar pré-condições (itens, pagamento, checklist) é risco financeiro e de processo; o
   caminho certo já existe em botões (Iniciar/Pausar/Faturar/Enviar). 🔴
8. **O.S. Aprovada sem técnico ("Não definido")** — e o botão "Iniciar" fica livre para qualquer um ("alguém precisa
   poder assumir"). O backend não valida o técnico (anotado no código). Falta um **"Atribuir técnico"** em destaque
   quando está vazio e um aviso na lista. 🟠
9. **Status aparece duas vezes** (selo no cabeçalho + o select logo abaixo) e as **ações do fluxo ficam misturadas** em
   uma fileira de 6–7 botões iguais (Compartilhar, Iniciar, PDF, Voltar…): não há "próximo passo" em destaque. 🟠
10. **O formulário inteiro abre editável antes de tudo**: Cliente/Veículo/Técnico/Previsão/KM no topo, itens abaixo da
    dobra. Para uma O.S. em andamento o que importa é: **andamento (cronômetro), próximo passo, o que falta**. 🟠
11. **Ruído**: "Chassi —" vazio, "Categoria: C · hora técnica deste veículo" como selo; "Compartilhar" numa O.S. já
    aprovada (o link é para aprovação do cliente — faz sentido só até aprovar). 🟡
12. **Cabeçalho sem contexto**: só "OS …"; falta **cliente · placa · modelo** logo abaixo do título (hoje é preciso
    rolar para ver quem é). 🟡
13. **Entrega**: "Entregue" só existe como opção do seletor de status; o painel do consultor fala em "checklist de
    saída", mas o detalhe não tem um botão "Registrar entrega" que leve ao checklist. 🟠 *(a validar nas abas)*
14. **Item de catálogo × itens livres**: a O.S. herda o `ItemsEditor` do orçamento (agora com tempo/valor da hora);
    não mostra o **lucro**/custo (correto, é interno), mas também não destaca o que **mudou em relação ao orçamento
    aprovado**. 🟡 *(a validar)*

### Acessibilidade
15. Selo/tempo estourado dependem de cor + ícone sem texto na lista; tabelas já com linha focável (rodada anterior).
    Botões de ação 40 px. Status em `<select>` sem rótulo visível. 🟢

## Etapa 2 — Score UX

| Critério | Nota |
|---|---|
| Clareza | 6,0 |
| Usabilidade | 5,0 |
| Acessibilidade | 6,5 |
| Arquitetura da informação | 5,0 |
| Hierarquia visual | 5,0 |
| Eficiência operacional | 4,5 |
| Experiência do usuário | 5,2 |
| **Geral** | **5,3 / 10** |

## Etapa 3 — Severidade
1. 🔴 Status mudável por dropdown livre (#7)
2. 🟠 Lista sem urgência/prazo/sem-técnico (#1–3) · busca só por número (#6) · Aprovada sem técnico (#8) · ações sem "próximo passo" e status duplicado (#9) · formulário primeiro (#10) · entrega sem botão (#13)
3. 🟡 Filtros e linha (#4, #5) · ruído e cabeçalho sem contexto (#11, #12) · mudanças vs. orçamento (#14)
4. 🟢 Acessibilidade fina (#15)

## Etapa 4 — Veredito
O fluxo (orçamento → O.S. → técnico → faturar → entregar) existe e é rico, mas a tela de detalhe é **um formulário com
botões ao redor**, não um **painel de andamento**. Recomendo **redesenhar o detalhe** como painel (estado + próximo
passo + dados) e a **lista** como fila de trabalho. O nome vira **O.S.**

## Etapa 5 — Nova experiência
1. **Detalhe em 3 faixas**: (a) cabeçalho: **O.S. 000049 · Bruno Henrique Santos · MTG0006 Fiat Argo** + selo de status;
   (b) **faixa de andamento**: stepper `Aberta → Aprovada → Em execução → Concluída → Faturada → Entregue`, com o
   **próximo passo como botão primário único** ("Atribuir técnico e iniciar", "Faturar no caixa", "Registrar entrega");
   (c) abas Dados · Itens · Checklists · Fotos · Histórico.
2. **Sai o seletor livre de status.** Transições só pelos botões do fluxo; correções excepcionais num menu "⋯ → Alterar
   status (admin)" com confirmação e motivo (e auditoria).
3. **Técnico responsável em destaque**: se vazio, aviso âmbar "Sem técnico — ninguém foi designado" + botão **Atribuir**;
   a lista marca "sem técnico".
4. **Dados da O.S. recolhidos** em leitura (cliente, veículo, KM, previsão) com "Editar" — editar é exceção, e o backend
   já bloqueia depois de iniciar.
5. **Lista como fila**: ordenar por prioridade (atrasadas, prontas p/ faturar/entregar primeiro) com opção "mais
   recentes"; colunas: O.S. · Cliente/placa/modelo · **Previsão** (com "atrasada") · Técnico (ou "Sem técnico" em âmbar)
   · Valor · Status; ação principal por status (Faturar, Entregar, Atribuir) no lugar do PDF.
6. **Busca ampla**: número, placa, cliente; **chips com contagem** e filtro "Sem técnico" / "Atrasadas" / "Minhas".
7. **Cronômetro** (tempo vendido/consumido/restante) sempre à vista na faixa de andamento quando houver.
8. **Entrega**: botão "Registrar entrega" que abre o checklist de saída (já existe a aba) e só então muda para Entregue.

**Benefícios:** a recepção vê em 5 s o que travou e o que fazer; menos mudança de status errada (que mexe em caixa e
comissão); menos O.S. paradas sem técnico. **Negócio:** carros liberados mais rápido, faturamento sem esquecimento.

## Etapa 6 — Wireframe (detalhe)

```
O.S. 000049 · Bruno Henrique Santos · MTG0006 Fiat Argo (cat. C)           [PDF] [⋯]   [Voltar]
Consultor: Carla Consultora
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Aberta ──● Aprovada ──○ Em execução ──○ Concluída ──○ Faturada ──○ Entregue            │
│ ⚠ Sem técnico responsável                          [ Atribuir técnico e iniciar ▶ ]     │
│ Vendido 02:30 · Consumido 00:00 · Restante 02:30        Previsão: —  [definir]          │
└────────────────────────────────────────────────────────────────────────────────────────┘
 [ Dados ] [ Itens (1) ] [ Checklists ] [ Fotos ] [ Histórico ]
 Cliente Bruno Henrique Santos · CPF …   Veículo MTG0006 · KM entrada —        [Editar]
```

Lista:
```
O.S. 🔎 número, placa ou cliente…   [Todas 52] [Atrasadas 3] [Sem técnico 7] [Prontas p/ faturar 10] [Minhas] [Mais ▾]
O.S.      Cliente · placa · modelo              Previsão       Técnico         Valor        Status         Ação
000052    Larissa F. Dias · MTG0010 Kwid        hoje 17:00     ⚠ Sem técnico   R$ 1.144,90  Aprovada     [Atribuir]
000040    Fernanda S. Alves · MTG0002 Onix      ontem ⚠ atras. Lia Mecânica    R$ 500,00    Concluída    [Faturar]
```

## Etapa 7 — Design system
Reutiliza `PageHeader`, `Tabs`, `Badge`, `Button`, `Card`, `Disclosure`, `Modal` (com foco), `DataTable` (linha
focável), `SegmentedControl` e o padrão de ficha de Cliente/Veículo. Novos: **`StepperStatus`** (andamento) e um
**menu "⋯"** (ainda não existe no sistema). Cores de status continuam as do `statusMeta`.

## Etapa 8 — Microinterações
Stepper animado ao avançar · toast com o que mudou ("O.S. 000049 → Em execução") e **desfazer** quando possível ·
confirmação com motivo em mudanças excepcionais · skeleton ao carregar · estado vazio da fila ("Nenhuma O.S. precisa de
ação agora") · foco no botão primário ao abrir.

## Etapa 9 — Acessibilidade
`<abbr>`/`aria-label` para "O.S."; stepper como lista ordenada com `aria-current="step"`; estados com texto além da
cor ("Atrasada", "Sem técnico"); alvos ≥ 44 px; status em controle rotulado, não `<select>` solto.

## Etapa 10 — Resultado final

| | Antes | Depois (estimado) |
|---|---|---|
| Status alterável por dropdown livre | sim | não (botões do fluxo + exceção auditada) |
| Ver "o que depende de mim" | filtrar e ler a lista | fila priorizada + chips com contagem |
| Próximo passo na O.S. | 6–7 botões iguais | 1 botão primário |
| Achar por placa/nome | não (só número) | sim |
| Score UX | **5,3** | **8,4** |

**Ordem sugerida:** (1) nome **O.S.** e título do detalhe com cliente·placa·modelo (texto, sem risco); (2) busca por
placa/cliente + chips com contagem + "sem técnico" na lista; (3) retirar o seletor livre de status (botões do fluxo +
exceção para admin); (4) faixa de andamento com próximo passo; (5) fila priorizada com previsão/atrasada; (6) entrega
com checklist.

**A verificar antes de implementar**
- O backend filtra O.S. por **placa/cliente** além de `numero`/`clienteDocumento`? (hoje só número, status, técnico e
  documento) — senão a busca é no cliente, limitada à página.
- Quais transições o backend **aceita de fato** pelo `PATCH /status` (para decidir o que o menu de exceção oferece).
- Há **auditoria** de mudança de status (quem/quando/motivo)?
- Existe "previsão de conclusão" **na listagem** (`OrdemServicoResponse.dataPrevisao`)? (parece existir no detalhe)
- O mecânico acessa essa lista (`isMecanico` → `/minhas-os`): as mudanças da lista precisam respeitar esse desvio.

Nada foi alterado em `src/` por esta revisão.
