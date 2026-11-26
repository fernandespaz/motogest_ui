# Revisão UX — Veículos

Base: `VeiculosPage`, `VeiculoFormModal`, `PlacaHero`, `VeiculoDadosValidacao` e a tela rodando em 1440×900
(Administrador, dados de teste): lista e modal "Novo veículo". Não vi o modal de edição de um veículo existente, a
busca por placa nem o celular (só código).

## Etapa 1 — Análise crítica

### O que a recepção faz com veículos
Achar o carro **pela placa** (o cliente chega e diz "ABC-1234"), ver de quem é e **começar algo** (orçar, agendar, ver
o histórico). Cadastrar um carro novo é frequente, mas quase sempre **vindo de um cliente**. A tela atual é um cadastro
(lista + formulário); não é um ponto de partida de trabalho.

### Problemas de fluxo
1. **Clicar na linha abre o formulário de edição** — mesmo padrão que a lista de Clientes tinha. Não há ficha do
   veículo: dono (com link), histórico de OS/orçamentos, última entrada, KM. Para saber se "esse carro já passou aqui"
   é preciso ir a OS e filtrar. 🔴
2. **Sem atalhos a partir do veículo**: "Novo orçamento", "Agendar", "Ver OS". Nada leva a lugar nenhum. 🟠
3. **O nome do cliente na linha é texto morto** — a ligação veículo→cliente (a mais usada) não é clicável, apesar de o
   perfil do cliente já existir. 🟠
4. **Novo veículo a partir do cliente não existe**: o perfil do cliente lista os veículos, mas não tem "Adicionar
   veículo" (que abriria o formulário com o proprietário já preenchido). Hoje o caminho é Veículos → Novo → buscar o
   cliente de novo. 🟠
5. **Busca só por placa**, e só aparece para quem tem `CLIENTE_READ` (passa por `GET /clientes`, ver
   `useBuscaVeiculosPorPlaca`). Não acha por modelo, cliente ou chassi; resultado de busca sem paginação; sem filtros
   (categoria) nem ordenação. 🟡

### Problemas de informação / visuais
6. **Categoria "A/B/C" como badge colorido** (verde/laranja/vermelho): não diz o que é (hora técnica) e as cores lêem
   como alerta/gravidade. No cadastro de cliente isso já foi neutralizado; aqui ficou. 🟡
7. **Colunas pouco úteis**: "KM atual" (dado que envelhece) ocupa espaço; **ano/cor** — o que distingue dois Onix do
   mesmo cliente — não aparecem. 🟡
8. **Excluir sempre visível** (botão vermelho cheio) ao lado de editar em toda linha; editar é redundante com o clique
   na linha. 🟠
9. Subtítulo sem contagem ("N veículos"); sem indicação de veículos **sem categoria** (legado), que bloqueiam
   orçamento por hora técnica. 🟡

### Formulário "Novo veículo"
10. **Pontos fortes** (manter): placa em destaque com consulta automática, preço da consulta informado antes
    ("Cada consulta custa R$ 0,35"), consulta só no clique (sem cobrança surpresa), e o rodapé que **lista o que falta**
    ("Para salvar, preencha: Cliente, Placa, Modelo, Ano de fabricação, Cor, Chassi"). Isso é raro e bom.
11. **Obrigatoriedade pesada**: Chassi, Cor e Ano de fabricação obrigatórios (e Ano do modelo opcional, Marca opcional
    mas Modelo obrigatório) travam o cadastro no balcão quando a consulta de placa não está disponível ou falha — o
    cliente está na frente e o chassi está embaixo do carro. Critérios inconsistentes entre campos parecidos. 🟠
12. **Categoria já vem como "A"** (select sem placeholder) e define a **hora técnica cobrada** nos orçamentos: se
    ninguém olhar, um carro de categoria maior é cobrado como A. É uma decisão de preço escondida num default. 🟠
13. "Passo 1 · …" sem passo 2/3 visíveis: a numeração promete uma sequência que a tela não mostra. 🟡
14. Proprietário vem **depois** da placa — correto para quem consulta, mas quando vindo do cliente deveria vir
    preenchido e recolhido. 🟡

### Acessibilidade
15. Boa base (labels, `sr-only` na placa, mensagens de consulta, modal agora com foco gerenciado). Fracos: a coluna de
    categoria depende de cor + 1 letra; botões de ação 40 px; thumbs de modelo sem texto alternativo (decorativas). 🟢

## Etapa 2 — Score UX

| Critério | Nota |
|---|---|
| Clareza | 6,5 |
| Usabilidade | 5,5 |
| Acessibilidade | 6,5 |
| Arquitetura da informação | 5,0 |
| Hierarquia visual | 5,5 |
| Eficiência operacional | 5,0 |
| Experiência do usuário | 5,6 |
| **Geral** | **5,6 / 10** |

## Etapa 3 — Severidade
1. 🔴 Sem ficha do veículo; clique abre edição (#1)
2. 🟠 Sem atalhos (#2) · cliente não clicável (#3) · sem "Adicionar veículo" no perfil do cliente (#4) · excluir sempre visível (#8) · obrigatoriedade pesada (#11) · categoria "A" por padrão define preço (#12)
3. 🟡 Busca limitada (#5) · badge de categoria (#6) · colunas (#7) · subtítulo/sem categoria (#9) · passos (#13) · proprietário (#14)
4. 🟢 Acessibilidade fina (#15)

## Etapa 4 — Veredito
Manter o formulário (é a melhor parte da tela) e **trocar o ponto de entrada**: a lista deve levar a uma **ficha do
veículo** com dono, histórico e ações. Ajustar a obrigatoriedade e o default da categoria, que têm efeito direto em
atendimento e em preço.

## Etapa 5 — Nova experiência
1. **Ficha do veículo** ao clicar na linha (mesmo padrão do perfil do cliente): placa grande, marca/modelo/ano/cor/KM,
   categoria com a hora técnica ("Cat. B · R$ 500/h"), **proprietário clicável** (abre o perfil), botões
   **Novo orçamento / Agendar**, e histórico (OS e orçamentos pela placa/veículo). **Editar** é um botão dentro dela.
2. **Lista enxuta**: Placa (destaque) · Marca/modelo + ano · Cliente (link) · Categoria em texto neutro · ação
   principal "Orçar"; editar/remover saem da linha (remover só na ficha).
3. **Busca ampla**: placa, modelo, cliente e chassi, com filtro de categoria e o selo "sem categoria" para os legados.
4. **"Adicionar veículo" no perfil do cliente**, abrindo o formulário com o proprietário preenchido.
5. **Cadastro mínimo**: obrigatórios apenas **Cliente, Placa, Modelo e Categoria**; Chassi, Cor, Ano e KM como
   "recomendados" (aviso, não bloqueio) — e o rodapé continua dizendo o que falta.
6. **Categoria sem default silencioso**: placeholder "Escolha a categoria" (ou sugerir pela marca/modelo do catálogo
   com o rótulo "sugerida") e mostrar o valor da hora ao lado.
7. **Passos coerentes**: tirar "Passo 1" ou mostrar 1·Placa 2·Proprietário 3·Dados.

**Benefícios:** achar a placa → agir em 1 clique; histórico à vista evita retrabalho; cadastro no balcão sem travar;
preço por hora correto. **Negócio:** mais orçamentos iniciados da lista, menos cobrança com categoria errada.

## Etapa 6 — Wireframe

```
Veículos         47 veículos · 3 sem categoria                                    [ + Novo veículo ]
🔎 placa, modelo, cliente ou chassi…    [Categoria ▾]  [ Sem categoria (3) ]
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ MTG0001   Volkswagen Gol 2020 · Prata       Carlos Eduardo Lima ›     Cat. A        [ Orçar ]│
│ MTG0002   Chevrolet Onix 2022 · Branco      Fernanda Souza Alves ›    Cat. B        [ Orçar ]│
└──────────────────────────────────────────────────────────────────────────────────────────┘
  ↓ clique na linha
┌ Ficha ───────────────────────────────────────┐
│ MTG0002 · Chevrolet Onix 2022 · Branco  [Editar]│
│ Proprietária: Fernanda Souza Alves ›  KM 1.250  │
│ Categoria B · hora técnica R$ 500/h             │
│ [Novo orçamento] [Agendar]                      │
│ Histórico: OS-000040 Faturada R$ 500 · #46 …    │
└─────────────────────────────────────────────────┘
```

## Etapa 7 — Design system
Reutiliza `DataTable` (linha focável), `SearchInput`, `Badge`, `Modal`, `FormSection`, `Disclosure`, o padrão de
`ClientePerfilModal` (mesma estrutura de ficha) e `ModeloVeiculoThumb`. Novo só se necessário: `VeiculoFichaModal`
(derivado do perfil do cliente, para não duplicar: extrair o bloco de histórico).

## Etapa 8 — Microinterações
Placa formatada ao digitar (ABC-1D23) · feedback "consultando…" e custo debitado após a consulta · aviso quando a
placa já existe ("Esse veículo já está cadastrado para <cliente>") · toast "Veículo adicionado a <cliente>" · estado
vazio do histórico ("Nenhuma OS ainda — [Novo orçamento]") · confirmação de remoção mostrando quantas OS/orçamentos
estão ligados.

## Etapa 9 — Acessibilidade
Categoria com texto "Categoria B" (não só cor); `title`/rótulo nos thumbs; link do cliente com texto descritivo;
ficha com foco gerenciado (o `Modal` já faz); erros do formulário ligados por `aria-describedby`; alvos ≥ 44 px.

## Etapa 10 — Resultado final

| | Antes | Depois (estimado) |
|---|---|---|
| Clique na linha | formulário de edição | ficha com dono + histórico + ações |
| Ir do carro ao orçamento | 4+ cliques | 1 |
| Campos obrigatórios | 6 (placa, cliente, modelo, ano, cor, chassi) | 4 (placa, cliente, modelo, categoria) |
| Categoria de um carro novo | "A" por padrão | escolha explícita |
| Score UX | **5,6** | **8,3** |

**Ordem sugerida:** (1) categoria sem default + cadastro mínimo (impacto em preço/atendimento, baixo risco); (2) cliente
clicável e "Adicionar veículo" no perfil do cliente; (3) ficha do veículo; (4) lista enxuta e busca ampla.

**A verificar antes de implementar**
- Quais campos o **backend** exige de verdade (chassi/cor/ano são regra do backend ou só do front?); relaxar no front
  sem o backend aceitar só move o erro de lugar.
- O backend aceita criar veículo **sem categoria** (hoje recusa com 400) — então "sem default" só vale com escolha
  obrigatória, não opcional.
- Histórico por veículo: OS filtra por `clienteDocumento`, não por veículo — para a ficha, filtrar no cliente por
  `veiculoId` (limitado às últimas N) ou pedir filtro `veiculoId` ao backend.
- Existe busca por modelo/chassi no backend? (hoje a busca por placa passa por `/clientes`.)

Nada foi alterado em `src/` por esta revisão.
