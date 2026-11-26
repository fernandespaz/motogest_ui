# Revisão UX — Clientes

Base: `ClientesPage`, `ClienteFormModal`, `VeiculosEditor`, `VeiculoVinculadoRow` e a tela rodando em 1440×900
(Administrador, 15 clientes de teste): lista e modal "Editar cliente". Não vi o modal em "Novo cliente" preenchido nem o
celular (só código).

## Etapa 1 — Análise crítica

### O que a recepção/consultor faz nessa tela
Quase sempre **acha um cliente** (nome, CPF/CNPJ ou placa) para **começar algo**: orçamento, agendamento, ligar,
consultar o veículo. Cadastrar/editar é a minoria. A tela está montada ao contrário: tudo leva a editar.

### Problemas de fluxo
1. **Clicar na linha abre o formulário de edição completo** (modal largo com ~15 campos + veículos). Não existe um
   "perfil" de leitura do cliente: quem só quer olhar um dado ou começar um orçamento cai num formulário que dá
   medo de mexer. 🔴
2. **Sem atalhos de ação a partir do cliente**: não há "Novo orçamento", "Agendar", "WhatsApp", "Ver histórico/OS". O
   cliente é um beco sem saída — para orçar é preciso ir a Orçamentos e buscar o mesmo cliente de novo. 🔴
3. **Nenhum contexto de relacionamento**: a lista não mostra última visita, OS/orçamentos em aberto, valor gasto
   nem inadimplência. Para a oficina isso é o que diferencia "João Silva" de "o João que está com o carro na fila". 🟠
4. **Busca zero resultados abre um diálogo modal** ("Nada encontrado… Entendi") em vez de um estado vazio na própria
   lista — interrupção desnecessária que exige um clique a cada busca sem resultado. 🟠
5. **Excluir está sempre exposto** como botão vermelho cheio ao lado de editar, na linha de cada cliente. Erro de clique
   caro (há confirmação, mas a ação é rara e o destaque é igual ao de editar). A edição, por sua vez, é redundante com o
   clique na linha. 🟠

### Problemas de informação / visuais
6. **Colunas de baixo valor ocupando espaço**: "Tipo" (quase tudo "Física") e "Status" (quase tudo "Ativo") têm uma
   coluna cada; o que sobra de largura aperta o **telefone, que quebra em duas linhas** ("(11) 91000-/0000"). 🟡
7. **Veículos como badges coloridos de placa+categoria** (verde A, laranja B, vermelho C): o vermelho/laranja lê como
   alerta/erro, mas só indica categoria de hora técnica. Com 3–4 veículos a célula cresce e a linha fica irregular. 🟡
8. **Contato mostra só o telefone** (ou e-mail se não houver telefone) — sem ação de ligar/WhatsApp, e sem indicar
   quando falta contato. 🟡
9. **Sem ordenação nem filtros** (ativos/inativos, tipo, com OS em aberto). Só busca textual. 🟡

### Modal de edição
10. **Estrutura boa** (Dados → Endereço → Veículos) e CEP com busca automática, mas: endereço (raramente usado em
    oficina) tem o mesmo peso que contato; **veículos vinculados ficam abaixo da dobra** e cada um tem editar/remover
    vermelhos de novo; nota "Alterações em veículos só são salvas quando você clica em Salvar" fica no fim, longe de
    onde o usuário age. 🟡
11. **Edição de veículo dentro do cliente + tela própria de Veículos**: dois lugares para a mesma coisa; risco de o
    usuário não saber onde está a "verdade". 🟡
12. **Documento obrigatório** para cadastro rápido: no balcão, o cliente ainda não deu CPF — exigir tudo trava o
    atendimento (o Orçamento já resolveu isso com "Ainda não cadastrado"). 🟠

### Acessibilidade
13. Pontos bons: busca com `SearchInput` e rótulo, linhas agora focáveis por teclado (melhoria desta rodada), modal com
    foco gerenciado. Fracos: os badges de categoria dependem da cor para diferenciar A/B/C (há letra, ok); alvos de
    ação 40 px; iniciais em círculo (decorativas) sem `aria-hidden`. 🟢

## Etapa 2 — Score UX

| Critério | Nota |
|---|---|
| Clareza | 6,5 |
| Usabilidade | 5,0 |
| Acessibilidade | 6,5 |
| Arquitetura da informação | 5,0 |
| Hierarquia visual | 5,5 |
| Eficiência operacional | 4,5 |
| Experiência do usuário | 5,2 |
| **Geral** | **5,5 / 10** |

## Etapa 3 — Severidade
1. 🔴 Linha abre formulário de edição, sem perfil/leitura (#1) · 🔴 sem atalhos para orçar/agendar/contatar (#2)
2. 🟠 Sem contexto de relacionamento (#3) · 🟠 diálogo "Nada encontrado" (#4) · 🟠 excluir sempre exposto (#5) · 🟠 documento obrigatório no balcão (#12)
3. 🟡 Colunas de baixo valor / telefone quebrado (#6) · badges com cor de alerta (#7) · contato sem ação (#8) · sem filtros (#9) · modal e veículos (#10, #11)
4. 🟢 Acessibilidade fina (#13)

## Etapa 4 — Veredito
A lista funciona para **cadastro**, mas não para o **uso diário**. Recomendo **trocar o clique da linha por um painel
de perfil do cliente** (leitura + ações) e deixar a edição como ação explícita. Os dados e componentes existem; falta
a camada de "o que fazer a partir daqui".

## Etapa 5 — Nova experiência
1. **Perfil do cliente** (painel lateral/gaveta) ao clicar na linha: nome, tipo, documento, contato com botões
   **Ligar / WhatsApp / E-mail**, veículos (com atalho "Novo orçamento" por veículo), resumo (OS em aberto, orçamentos
   pendentes, última visita) e abas **Histórico** e **Dados**. **Editar** é um botão no perfil.
2. **Ações rápidas na linha**: "Novo orçamento" (principal) e "Agendar"; editar/remover vão para um menu "⋯"; remover
   só dentro do perfil, em área de perigo.
3. **Cadastro rápido**: só **nome + telefone** obrigatórios (e documento opcional, a completar depois); o fluxo de
   orçamento "ainda não cadastrado" já mostra que o negócio aceita isso.
4. **Lista enxuta**: Nome (+documento), Contato (sem quebra), Veículos (placas; modelo no tooltip, categoria só no
   perfil), **Última visita** e **Em aberto**; Tipo/Status viram filtros e um selo só quando inativo/PJ.
5. **Busca com resultado vazio inline** ("Nenhum cliente para 'xyz' · Cadastrar 'xyz'") em vez de diálogo.
6. **Filtros**: Ativos/Inativos, PF/PJ, "Com OS em aberto", "Sem veículo".
7. **Modal de edição**: dados de contato primeiro, **endereço recolhido** (Disclosure), veículos logo abaixo dos
   dados, aviso de "salva ao clicar em Salvar" junto do botão.

**Benefícios ao usuário:** achar → agir em 1 clique; menos medo de editar sem querer. **Ao negócio:** mais
orçamentos/agendamentos nascidos da própria lista, retorno de clientes (última visita), menos cadastro abandonado.
**Atrito:** de "buscar na lista → abrir formulário → fechar → ir a Orçamentos → buscar de novo" para 1 clique.

## Etapa 6 — Wireframe

```
Clientes                15 clientes · 2 com OS em aberto                         [ + Novo cliente ]
🔎 nome, CPF/CNPJ ou placa…      [Ativos ▾] [PF/PJ ▾] [Com OS em aberto]
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ CL  Carlos Eduardo Lima        (11) 91000-0000  MTG0001 · AGD1A01   Última visita 12/11  │
│     111.222.333-44                                                  1 OS em aberto  [ Orçar ] [⋯]│
│ FA  Fernanda Souza Alves       (11) 91000-0001  MTG0002 · AGD1A02 …   —                 [ Orçar ] [⋯]│
└─────────────────────────────────────────────────────────────────────────────────────────┘
  ↓ clique na linha
┌ Perfil ─────────────────────────────────┐
│ Fernanda Souza Alves      [Editar]       │
│ PF · 222.333.444-55 · fernanda@teste.com │
│ [📞 Ligar] [💬 WhatsApp] [Agendar] [Orçar]│
│ Resumo: 0 OS em aberto · 3 orçamentos     │
│ ▸ Veículos (3)   ▸ Histórico   ▸ Dados    │
│ MTG0002 Chevrolet Onix · B  [Orçar] [⋯]   │
└──────────────────────────────────────────┘
```

## Etapa 7 — Design system
Reutiliza `PageHeader`, `Card`, `DataTable` (agora com linha focável), `SearchInput`, `Badge`, `IconActionButton`,
`Button`, `Disclosure` (endereço recolhido), `Modal` (ou gaveta com o mesmo foco/teclado), `SegmentedControl`. Novo
com ganho real: **painel/gaveta de perfil** e **menu "⋯"** de linha (hoje não existe um componente de menu).

## Etapa 8 — Microinterações
Skeleton na lista · estado vazio inline com "Cadastrar 'xyz'" · toast com "Desfazer" ao remover · foco no nome ao
abrir "Novo cliente" · validação inline de CPF/CNPJ (dígito verificador) e telefone · "salvando…" no botão (já
existe) · máscara de telefone/CEP (já existe).

## Etapa 9 — Acessibilidade
Menu "⋯" com `aria-haspopup`/teclado; gaveta com foco preso e retorno (o `Modal` já faz); iniciais em círculo com
`aria-hidden`; telefone como `<a href="tel:">` e WhatsApp como link com rótulo; alvos ≥ 44 px; selo de inativo com
texto (já tem).

## Etapa 10 — Resultado final

| | Antes | Depois (estimado) |
|---|---|---|
| Cliques para iniciar um orçamento a partir do cliente | 4+ (sair, buscar de novo) | 1 |
| Clique na linha | formulário de edição | perfil de leitura com ações |
| Busca sem resultado | diálogo modal | estado vazio inline |
| Telefone | quebra em 2 linhas | em 1 linha |
| Score UX | **5,5** | **8,3** |

**Ordem sugerida:** (1) busca vazia inline + telefone sem quebra + Tipo/Status enxutos (rápido, sem risco);
(2) "Novo orçamento"/"Agendar" na linha (leva o cliente já selecionado — precisa de `?clienteId=` nas rotas);
(3) menu "⋯" e remover só no perfil; (4) perfil do cliente com histórico; (5) cadastro rápido com documento opcional.

**A verificar antes de implementar**
- O backend aceita cliente **sem documento**? (hoje o schema exige; verificar `ClienteRequest` e regras de unicidade.)
- Há endpoint de **histórico/resumo** do cliente (OS, orçamentos, última visita) ou precisa agregar no front a partir
  de `/orcamentos` e `/ordens-servico`?
- Excluir cliente **com OS/orçamentos** é permitido ou o backend recusa? (define a mensagem e se vale "inativar").
- Rotas de orçamento/agendamento aceitam pré-selecionar cliente por parâmetro? (agendamento já usa `?agendamentoId=`.)

Nada foi alterado em `src/` por esta revisão.
