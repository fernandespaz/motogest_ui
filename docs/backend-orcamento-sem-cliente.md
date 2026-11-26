# Backend: orçamento em rascunho sem cliente cadastrado

Contexto: hoje `OrcamentoRequest` exige `clienteId`, `veiculoId` e `itens` (conferido no
`openapi.json` commitado; reconferir na spec ao vivo `GET /v3/api-docs` antes de implementar). O
vendedor não consegue orçar antes de cadastrar o cliente. O front **ainda não foi alterado**: depende
dos campos abaixo, que não existem hoje.

## Regra de negócio

Um orçamento em `RASCUNHO` pode existir sem cliente e sem veículo cadastrados. Cliente e veículo
passam a ser obrigatórios a partir de `ENVIADO`. O cliente fica como "interessado" (dados mínimos
gravados no próprio orçamento), sem criar registro em `clientes`.

Por que não um cliente temporário: polui `clientes` (listas, busca, financeiro, relatórios) e o
backend exige `documento` em `ClienteRequest`, que teria de ser inventado.

Por que o veículo avulso: o veículo só existe com `clienteId` (`VeiculoRequest`), e a categoria dele
define a hora técnica. Sem categoria, serviço cobrado por hora técnica não calcula preço.

## 1. Mudanças no banco

- `orcamento.cliente_id` e `orcamento.veiculo_id`: passam a aceitar `NULL`.
- Colunas novas, todas nullable, sem backfill (orçamentos existentes ficam como estão):
  `interessado_nome`, `interessado_telefone`, `interessado_email`,
  `veiculo_categoria`, `veiculo_placa`, `veiculo_descricao` (marca/modelo em texto livre).
- Garantia no banco ou no serviço: se `status <> 'RASCUNHO'` então `cliente_id` e `veiculo_id` não
  são nulos.

## 2. Contrato

`OrcamentoRequest` e `OrcamentoResponse`:

| Campo | Tipo | Regra |
|---|---|---|
| `clienteId` | integer, opcional | Deixa de ser obrigatório. |
| `veiculoId` | integer, opcional | Deixa de ser obrigatório. Se informado, `clienteId` também (e o veículo deve pertencer ao cliente). |
| `interessadoNome` | string, opcional | Só vale sem `clienteId`. |
| `interessadoTelefone` | string, opcional | Idem. |
| `interessadoEmail` | string, opcional | Idem. E-mail válido. |
| `veiculoCategoria` | enum de categoria já usada em `VeiculoRequest`, opcional | **Obrigatória** quando não há `veiculoId` e algum item usa hora técnica. Base do cálculo. |
| `veiculoPlaca` | string, opcional | Texto livre, só informativo. |
| `veiculoDescricao` | string, opcional | Ex.: "Honda CG 160". |

Validações (400 com mensagem clara):
- `clienteId` junto com campos de interessado: rejeitar (ou ignorar os de interessado; definir e documentar).
- `veiculoId` sem `clienteId`: rejeitar.
- Item com hora técnica sem `veiculoId` nem `veiculoCategoria`: rejeitar.

`OrcamentoResponse` continua devolvendo `clienteNome` e `veiculoPlaca`. Sugestão: preenchê-los a
partir do interessado e do veículo avulso quando não houver cadastro, para as telas atuais não
quebrarem. Se preferirem não fazer isso, avisar, pois o front precisa tratar `null`.

## 3. Transições

- `POST /orcamentos/{id}/enviar`: se não houver `clienteId` e `veiculoId`, responder 4xx com mensagem
  que o front possa exibir ("Vincule um cliente cadastrado antes de enviar").
- `POST /orcamentos/{id}/aprovar` e conversão em OS: sem mudança, já partem de orçamento enviado.
- Vincular cliente: `PUT /orcamentos/{id}` com `clienteId` e `veiculoId` (somente em `RASCUNHO`). Ao
  vincular, limpar os campos de interessado e de veículo avulso. **Não** apagar nem recalcular os
  itens; só recalcular valores de hora técnica se a categoria do veículo real for diferente da avulsa
  (e devolver os novos valores na resposta).

## 4. Busca de duplicatas ao vincular (primeira versão)

Reaproveitar `GET /clientes?busca=`: o front passa o telefone, e-mail ou documento do interessado.
Pedido: confirmar que `busca` encontra por **telefone** e por **e-mail**, normalizando formatação
(`(11) 99999-1111` e `11999991111` devem casar). Se hoje só busca por nome e documento, estender.
Sem endpoint novo. Mesclagem de clientes duplicados fica fora desta entrega.

## 5. Pontos de atenção

- **Ida e volta:** campos novos já foram descartados pela persistência em outro caso. Salvar, buscar
  de novo e vir igual.
- **Multi-tenant:** nenhum dado de interessado vaza entre oficinas. Mesmas permissões de
  `ORCAMENTO_READ`/`WRITE`; consultor continua vendo só os próprios.
- **LGPD:** nome, telefone e e-mail do interessado são dados pessoais. Entram na política de
  retenção/anonimização que já vale para clientes.
- **Relatórios e indicadores:** `OrcamentoEmitido` e o tempo de resposta usam `dataEmissao`, que só
  existe depois de enviar, então não mudam. Conferir qualquer relatório que faça join obrigatório com
  `clientes`.
- Rascunhos sem cliente parados há muito tempo: fora do escopo (sem exclusão automática).

## Critérios de aceite

1. Criar orçamento sem `clienteId`/`veiculoId`, com `interessadoNome` e `veiculoCategoria`: 201, e
   GET devolve os mesmos valores.
2. Mesmo orçamento com serviço por hora técnica: valor calculado pela categoria informada.
3. `POST /enviar` sem cliente: 4xx com mensagem legível; com cliente vinculado: 200.
4. Vincular cliente e veículo via PUT: interessado e veículo avulso somem, itens preservados.
5. Orçamentos antigos continuam retornando como antes.
6. Busca de clientes por telefone formatado e não formatado encontra o mesmo cadastro.

## Depois da entrega

O front atualiza `openapi.json`, roda `npm run gen:api`, trata campos nulos (lista, PDF, WhatsApp),
adiciona o modo "ainda não cadastrado" no formulário, o botão "Vincular cliente" com busca de
duplicatas e o bloqueio de "Enviar" sem cliente.
