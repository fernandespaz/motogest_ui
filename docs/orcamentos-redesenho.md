# Redesenho do fluxo de Orçamentos — análise e proposta

Base: leitura de `OrcamentoFormPage.tsx`, `OrcamentosPage.tsx`, `ItemsEditor.tsx`, `orcamentoModo.ts`
e do `openapi.json` commitado (não conferi o backend ao vivo — ver "Pendências de verificação").

## 1. Jornada atual (o que já existe)

1. `/orcamentos/novo`: seletor **Cliente cadastrado / Interessado**. Interessado grava nome, telefone, e-mail,
   categoria e placa/descrição do veículo no próprio orçamento (só em RASCUNHO).
2. Veículo → vistoria 3D (só com cadastro) → itens (ItemsEditor) → observações → "Criar rascunho".
3. Na lista: Enviar (exige cliente+veículo cadastrados, senão 422) → Aprovar → Converter em OS
   (`POST /ordens-servico/a-partir-de-orcamento/{id}`).
4. Cliente aprova pelo link público; consultor pede desconto (`/descontos`), que obriga auto-save do rascunho.

Ou seja: o cenário "cliente sem cadastro" **já foi parcialmente resolvido**. As lacunas estão em itens, preço
e conversão.

## 2. Gargalos de usabilidade

| # | Problema | Evidência |
|---|----------|-----------|
| U1 | **Não existe item livre.** `ItemRequest` só tem `tipoItem` SERVICO/PRODUTO, `servicoId?`, `produtoId?`, `descricao`, `quantidade`, `valorUnitario`. O editor tem 2 listas (serviços / produtos) com Combobox de cadastro; a descrição livre existe só como "fallback" de serviço sem hora técnica. Peça sem cadastro não tem caminho natural. |
| U2 | **Sem custo nem margem.** `precoCusto` só existe em `ProdutoRequest/Response`. O item do orçamento recebe `valorUnitario` pronto: o consultor calcula margem fora do sistema (calculadora/planilha) e digita o resultado. |
| U3 | **Formulário longo e "tudo-ou-nada"**: cliente, veículo, validade, data de entrada, vistoria, itens, observações em uma página única; "Criar rascunho" só no fim, e o rascunho só é salvo antes disso em casos escondidos (`garantirOrigem` para desconto/reserva). Sem autosave real → perda de trabalho. |
| U4 | **Entrada do veículo obrigatória na prática** (campo sempre preenchido) e validade em dias exposta como campo principal: ruído para cotação rápida. |
| U5 | **Enviar ≠ aprovar ≠ converter**, 3 ações separadas em lugares diferentes (lista), e o envio é bloqueado com 422 se faltar cadastro — o bloqueio aparece só no fim, quando o consultor já está com o cliente esperando. |
| U6 | **Trocar de cliente apaga todos os itens** (`setValue('itens', [])`) — destrutivo para quem montou a cotação antes de identificar o cliente. |

## 3. Riscos de retrabalho

- **R1 – Conversão para OS de orçamento "interessado"**: `OrdemServicoRequest` exige `clienteId`/`veiculoId`; os dados avulsos
  (nome, telefone, placa, categoria) precisam ser recadastrados à mão. Hoje a única ponte é "escolher cliente e
  veículo e salvar" — digitação dupla.
- **R2 – Item livre vira OS sem origem**: sem `produtoId`, a OS não reserva/baixa estoque; quando a peça for
  cadastrada depois, ninguém reconcilia.
- **R3 – Preço sem rastro de custo**: sem `custoUnitario` no item, nem faturamento nem relatório de margem
  conseguem usar o dado; se o consultor digitar custo "em observações", ele vaza no PDF/link público.
- **R4 – Vazamento de dado interno**: `OrcamentoPublicoResponse` hoje só tem `itens` (array genérico) e `valorTotal`.
  Se `ItemResponse` ganhar custo/margem, **o mesmo DTO** pode ser reutilizado no público e no PDF.
  Precisa de DTO separado, não de "esconder no front" (o PDF é gerado no cliente: `orcamentoPdf.ts`).
- **R5 – Orçamento duplicado** quando cliente existente é cadastrado depois (já há `SugestoesClienteExistente`, bom).

## 4. Proposta de processo

Princípio: **orçamento é um documento comercial autônomo; nada é obrigatório para salvar; tudo que for
digitado é reaproveitado**. Cadastro vira consequência da aprovação, não pré-requisito.

1. **Criar em 1 passo**: abrir a tela já cria o rascunho (autosave com debounce) e ele aparece na lista.
2. **Identificação mínima opcional**: nome ou placa ou nenhum ("Cotação sem nome").
3. **Itens em tabela única**, estilo planilha, com linha em branco sempre pronta; item pode ser:
   catálogo de serviço, produto do estoque ou **livre** (só descrição). Busca única que mistura os 3 e oferece
   "Adicionar 'texto digitado' como item livre" (Enter).
4. **Precificação por linha**: custo + margem % → preço (ou preço → margem). Totais de rodapé: venda, custo, lucro, margem global
   (painel interno, colapsável, visível só para quem tem permissão).
5. **Prévia do cliente** ao lado (o que o cliente verá: descrição, qtd, unitário, total) — elimina a dúvida do "o que vaza".
6. **Aprovação** (link público, WhatsApp ou aprovação presencial pelo consultor) dispara conversão assistida.
7. **Conversão assistida para OS**: um diálogo "Falta pouco" mostra só o que está pendente (cliente? veículo? itens livres
   sem cadastro?), pré-preenchido com os dados do orçamento; cria/vincula cliente e veículo ali mesmo, sem sair da tela
   nem redigitar, e gera a OS copiando os itens 1:1.

### Fluxo ideal ponta a ponta

```
Atendimento ──► [Nova cotação] (rascunho criado e salvo sozinho)
   │  nome/placa opcionais; itens: catálogo | estoque | livre (custo + margem%)
   ▼
Prévia do cliente ──► Enviar (WhatsApp/PDF/link)  — nunca bloqueia por cadastro
   ▼
APROVADO (cliente no link, ou consultor registra "aprovado verbalmente")
   ▼
Conversão assistida: resolve só pendências (cliente/veículo/peças livres) ──► OS
   ▼
Execução (itens já como na cotação; peça livre → "pendente de compra/cadastro")
   ▼
Faturamento (valor = preço aprovado; custo real alimenta margem realizada)
```

## 5. Modelo de dados proposto

Princípio: **um item é uma linha única que atravessa Orçamento → OS → Faturamento** (mesma tabela ou
tabela espelho com `origem_item_id`), com snapshot de preço.

```
orcamento
  id, status, consultor_id, validade_dias, data_emissao, data_aprovacao, observacoes
  cliente_id?  veiculo_id?                       -- opcionais (já existe)
  interessado_{nome,telefone,email}              -- já existe
  veiculo_{placa,descricao,categoria}            -- já existe
  aprovacao_canal  (LINK|PRESENCIAL|WHATSAPP)    -- novo
  os_id?                                          -- novo: OS gerada (idempotência da conversão)

item_documento   (compartilhado por orçamento e OS)
  id, documento_tipo (ORCAMENTO|OS), documento_id, ordem
  origem_item_id?                                 -- item do orçamento que gerou este da OS
  natureza        (SERVICO|PRODUTO)               -- já existe como tipoItem
  vinculo         (CATALOGO|ESTOQUE|LIVRE)        -- novo; LIVRE = sem servico_id/produto_id
  servico_id?  produto_id?                        -- já existem
  descricao, unidade?, quantidade
  custo_unitario?       -- INTERNO. novo. nulo = "não informado"
  margem_percentual?    -- INTERNO. novo. fonte da verdade da edição
  valor_unitario        -- preço de venda (snapshot). já existe
  tempo_vendido_minutos?                          -- já existe
  pendencia_cadastro (bool)                       -- LIVRE ainda não vinculado a um produto/serviço
```

Regras:
- `valor_unitario = custo × (1 + margem/100)` calculado **no backend** ao receber custo+margem (o front só pré-visualiza);
  se vier só `valor_unitario`, a margem é derivada. Nunca confiar no cálculo do cliente.
- **Markup vs margem**: "margem de lucro" no negócio costuma ser sobre o preço (`preço = custo / (1 − m)`), enquanto
  `custo × (1+m)` é markup. Definir uma fórmula e rotular na UI. *(decisão de produto pendente)*
- Conversão copia item a item (`origem_item_id`), mantendo `vinculo=LIVRE` e `pendencia_cadastro` — a OS herda a peça
  livre e o estoque/compras podem resolver depois (cadastrar produto → `UPDATE vinculo=ESTOQUE`).
- Cliente/veículo do interessado: endpoint `POST /orcamentos/{id}/converter-em-os` aceita `clienteId/veiculoId`
  **ou** `criarCliente: true` e usa os dados avulsos do orçamento para criar os cadastros na mesma transação.
- **DTOs separados**: `ItemResponse` (interno, com custo/margem/lucro, protegido por permissão tipo
  `ORCAMENTO_VER_CUSTO`) × `ItemPublicoResponse` (descricao, quantidade, valorUnitario, valorTotal). O PDF do cliente
  usa apenas o público; o PDF interno é outra opção explícita.

## 6. Mudanças no frontend (fases)

**Fase 1 — valor imediato, quase só front + 3 campos no backend**
- Backend: `ItemRequest/Response` + `custoUnitario`, `margemPercentual`; `vinculo` derivável (sem ids = LIVRE).
- `ItemsEditor`: nova linha "Item livre" (descrição, qtd, custo, margem%, preço) e atalho "adicionar texto como item livre".
  Reuso do componente em OS (mesmo editor, flag `mostrarCusto` por permissão).
- Painel interno de lucro; PDF/link público só com campos do cliente (teste automatizado garantindo que custo/margem nunca
  entram em `orcamentoPdf.ts` nem na página pública).

**Fase 2 — fluxo**
- Autosave de rascunho; remoção de campos obrigatórios (entrada do veículo opcional/recolhida).
- Trocar cliente **não apaga** itens (reprecificar só os de hora técnica, com aviso).
- Enviar nunca bloqueado por cadastro (link público não precisa de cliente cadastrado).
- Botão único "Aprovar e gerar OS" com a conversão assistida.

**Fase 3 — escala**
- Itens livres com `pendencia_cadastro` alimentam fila de cadastro de peças / compras; reserva de estoque ao converter;
  margem realizada no faturamento vs margem orçada.

## 7. Pendências de verificação / decisões

1. Confirmar no backend ao vivo (`/v3/api-docs`) o que a conversão `a-partir-de-orcamento` faz com `interessado*` e se
   ela já copia itens sem `servicoId/produtoId`; o `openapi.json` commitado pode estar defasado.
2. Fórmula de margem (sobre custo × sobre preço).
3. Quem pode ver custo/margem (nova permissão ou perfil Consultor/Administrador).
4. Aprovação presencial: o consultor pode aprovar em nome do cliente? (hoje `aprovar` existe e exige permissão).
5. Itens livres na OS devem baixar estoque? Proposta: não até haver vínculo.

Nada disso foi implementado — este documento é só análise e proposta.
