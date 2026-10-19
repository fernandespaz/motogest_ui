# Backend: lacunas para a Agenda (calendário + Kanban)

Contrato verificado em `http://localhost:8080/v3/api-docs` (idêntico ao `openapi.json` commitado).

## O que existe hoje

| Recurso | Realidade do backend |
|---|---|
| `Agendamento.status` | `AGENDADO`, `CONFIRMADO`, `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO` |
| Transição | `PATCH /api/v1/agendamentos/{id}/status?status=…` |
| Listagem por período | `GET /api/v1/agendamentos/periodo?inicio&fim` |
| `AgendamentoResponse` | `id, clienteId/Nome, veiculoId, veiculoPlaca, dataHora, status, observacoes, servicos[{id,nome}]` |
| `OrdemServico.status` | inclui `AGUARDANDO_PECA` e `PAUSADA`; `usuarioResponsavelId/Nome` |

## Lacunas e como o front contorna

1. **Não existe "Aguardando peças" no agendamento.** A coluna é *derivada*: um agendamento
   `EM_ANDAMENTO` cujo veículo tem uma OS em `AGUARDANDO_PECA` aparece nela. A coluna não
   aceita drop (não há status para gravar) e sair dela por arrasto é bloqueado com aviso —
   o usuário altera o status da OS. OS em `AGUARDANDO_PECA` sem agendamento aparecem como
   cards somente leitura com link para a OS.
2. **Agendamento não tem mecânico.** O front pega `usuarioResponsavelNome` da OS em aberto
   do mesmo veículo (prioridade: aguardando peça > em andamento > pausada > aprovada > aberta).
   Sem `ORDEM_SERVICO_READ` o mecânico e a coluna derivada simplesmente não aparecem.
3. **Não há vínculo agendamento ↔ OS.** O elo por `veiculoId` é heurística: se o mesmo
   veículo tiver duas OS abertas ou um agendamento futuro e uma OS de outro serviço, o
   casamento pode errar.
4. **`AgendamentoResponse` não traz modelo do veículo** (só a placa), então os cards mostram placa + cliente.
5. **Sem capacidade da oficina.** O indicador de carga usa a constante `CAPACIDADE_DIA = 8`
   (`agendaUtils.ts`). O ideal é a oficina configurar capacidade/dia (ou por mecânico).
6. **Duração do agendamento** não existe; eventos são pontuais (só `dataHora`).

## Pedidos sugeridos ao backend

- `AgendamentoStatus.AGUARDANDO_PECAS` (ou espelhar automaticamente a OS).
- `AgendamentoRequest/Response.usuarioResponsavelId/Nome` (mecânico) e `veiculoModelo`.
- `AgendamentoResponse.ordemServicoId` + `OrdemServicoResponse.agendamentoId`.
- Filtros no `/periodo`: `status`, `usuarioResponsavelId`.
- Endpoint/campo de capacidade diária da oficina.

## Limites conhecidos do front (a validar)

- **Transições de status não foram testadas no backend vivo** (evitei mutar dados compartilhados). O quadro libera
  qualquer movimento entre Agendado / Em andamento / Concluído; se o backend rejeitar alguma (ex.: CONCLUIDO → AGENDADO),
  o card volta à coluna de origem e o toast mostra a mensagem do backend. Quando houver a matriz oficial, restringir
  `validarMovimento` em `agendaUtils.ts`.
- **Janela do quadro (-14/+30 dias pelo `dataHora`)**: um agendamento EM_ANDAMENTO mais antigo que 14 dias some do quadro,
  pois `/periodo` não filtra por status.
- **OS limitadas às 200 mais recentes** (`size: 200`, `id,desc`): em oficinas maiores, OS antigas ainda abertas ficam fora
  do cruzamento (mecânico / aguardando peças). Falta filtro por status em lista de OS ou paginação aqui.

## Atualização: transições e massa de teste

- Lendo `AgendamentoService.atualizarStatus` no backend: **não há validação de transição** — qualquer status vira qualquer
  outro. Então o risco de o backend rejeitar movimentos do quadro é baixo (a regra de negócio, se existir, ainda precisa ser definida).
- `DevDataSeeder` (profile `dev`, H2 em memória) não criava nenhum agendamento — por isso o quadro/calendário ficavam vazios.
  Foi adicionado `criarAgendamentos(...)` com ~28 agendamentos casados com as OS do seeder (ver Javadoc do método):
  todos os status, EM_ANDAMENTO com OS em andamento / pausada / aguardando peça, sem OS vinculada, dia lotado (9),
  dia médio (4), passado e futuro. **O seeder só roda no boot com H2 vazio — reinicie o backend para carregar.**
- Frota extra (`criarFrotaDaAgenda`): 24 veículos `AGD1A01..24`, 17 com OS (8 básicas + 17 = 25 OS) em todos os estados
  (aberta, aguardando aprovação, aprovada, em andamento, pausada, aguardando peça, concluída, cancelada), 3 mecânicos,
  e 22 agendamentos. Reinicie o backend para recarregar.

## Regra de negócio: o técnico manda no andamento (substitui itens anteriores sobre arrastar cards)

- O **quadro é somente leitura**: não há arrastar nem "mover para". Iniciar, pausar, pedir peça e concluir são do
  técnico, na OS (cronômetro/status). A recepção só **confirma** ou **cancela** um agendamento ainda não iniciado.
- As colunas e indicadores usam o **status efetivo**: o da OS do veículo quando existe (em andamento/pausada → Em andamento;
  aguardando peça → Aguardando peças; concluída/faturada/entregue → Concluído), senão o do agendamento.
  A OS só vale para agendamentos de hoje ou passados, e OS encerrada só se concluída a partir do dia do agendamento.
- **Pedido ao backend**: hoje o `Agendamento.status` não acompanha a OS (só a Agenda do front faz o cruzamento). O ideal é o
  backend atualizar o agendamento automaticamente a partir das ações do técnico na OS (e guardar `ordemServicoId`),
  eliminando a heurística por veículo.

## Fluxo Agenda ↔ Orçamento ↔ OS (decisão: híbrido)

- **Vínculo já existe no backend**: `Orcamento.agendamentoId` e `OrdemServico.orcamentoId`. A Agenda usa esse vínculo exato
  (agendamento → orçamento → OS). Só agendamento **sem** orçamento cai na heurística por veículo (marcada no detalhe).
  Isso corrige a correção anterior neste documento: não faltava `agendamentoId`, faltava o front usá-lo.
- **Fluxo**: o agendamento continua rápido (recepção). "Criar orçamento" abre `/orcamentos/novo?agendamentoId=N`
  com cliente, veículo, observações e o vínculo pré-preenchidos; os serviços agendados aparecem num aviso (os itens são
  adicionados à mão porque o preço depende da hora técnica/categoria). O card mostra a etapa (sem orçamento → rascunho →
  aguardando cliente → aprovado → OS) e um botão de próximo passo (Criar orçamento / Abrir orçamento / Gerar OS / Abrir OS).
  "Gerar OS" reutiliza `useCriarOSAPartirDeOrcamento` (cria e já aprova a OS → entra na fila do técnico).
- **Coluna "Na fila"**: OS criada esperando o técnico iniciar, inclusive cliente que chegou sem agendar (card somente leitura).
- **Orçamento: PUT precisa reenviar `agendamentoId`** — o backend grava `null` se faltar (`OrcamentoService.atualizar`). O form
  de orçamento agora preserva o campo; qualquer outro cliente da API deve fazer o mesmo.
- **Pedido ao backend (continua)**: o `Agendamento.status` deveria acompanhar a OS/orçamento sozinho; hoje só o front cruza.
- **Seed (`DevDataSeeder.criarFrotaDaAgenda`)**: agendamentos com cadeia real (orçamento aprovado → OS) e agendamentos em cada
  etapa do orçamento (rascunho, enviado, aprovado sem OS, rejeitado). Regra do backend que o seed respeita: **1 OS
  EM_ANDAMENTO por técnico**.
