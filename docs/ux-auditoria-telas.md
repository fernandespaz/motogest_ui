# Auditoria UX transversal — todas as telas

Persona: Product Designer / UX Researcher sênior (prompt de 10 etapas). Escopo desta rodada: **padrões compartilhados**
(`components/ui/*`) e as telas de lista, mais a tela de Orçamento (já tratada em `orcamentos-ux-review.md` e
`orcamentos-adicionar-item-ux.md`).

**Método e limites (importante):** levantamento por leitura de código e varredura de padrões em `src/features/*`
(22 áreas, ~25 tabelas). Só a tela de Orçamento foi inspecionada rodando no navegador. As telas de OS (form), Agenda,
Dashboard, Produtos, Financeiro, Fiscal e Produtividade **não** foram avaliadas visualmente — os itens abaixo marcados
"a validar" precisam de uma passada com o app aberto.

## Já corrigido nesta rodada

| Onde | Problema | Correção | Sev. |
|---|---|---|---|
| `Modal` (usado em quase todo formulário/confirmação) | Sem `role="dialog"`/`aria-modal`/nome; foco não ia para o modal nem voltava ao fechar; Tab escapava para a página de trás | `role=dialog` nomeado pelo título, foco inicial no painel (respeita `autoFocus`), foco devolvido ao abrir→fechar, Tab/Shift+Tab presos no modal | 🔴 |
| `DataTable` (25 tabelas) | Linha clicável só com mouse; coluna de ações sem nome para leitor de tela; `<th>` sem `scope` | Linha focável com Enter/Espaço (ignora Enter em botões internos), foco visível, `scope="col"`, coluna vazia = "Ações" | 🟠 |
| Lista de Orçamentos | Sem busca, sem filtro por etapa, estado vazio sem ação, "Rejeitar" imediato (irreversível) | Busca por nº/cliente/placa (sem acento), chips de etapa com contagem, vazio com "Novo orçamento"/"Limpar filtros", confirmação ao rejeitar | 🟠 |

## Backlog priorizado (ainda não feito)

1. 🟠 **Listas sem busca/filtro** — Descontos, Usuários, Perfis, Meu Caixa, Root. (Orçamentos agora tem; OS, Clientes,
   Veículos, Produtos e Serviços já tinham.) Replicar o padrão `SearchInput` + chips de etapa.
2. 🟠 **Estados vazios sem ação** — só Veículos e Notas Fiscais passam `emptyAction`. Clientes, Serviços, Produtos,
   Usuários e OS mostram "Nenhum X" sem o botão de criar. Padrão já existe no `DataTable`.
3. 🟠 **Ações de linha só com ícone colorido** (`IconActionButton` 40×40, 3–4 por linha, mesmo peso visual para Aprovar,
   Rejeitar, WhatsApp, PDF, Remover). Rótulo existe só como tooltip — não aparece no toque/celular. Sugestão: 1 ação
   primária rotulada por status + menu "⋯" para as secundárias; manter o tom vermelho só no destrutivo.
4. 🟠 **Orçamento no celular** — o painel de resumo desce para o fim da página; falta barra inferior fixa com Total +
   Salvar (cuidado: duplicar o botão "Salvar" quebra os testes que buscam por nome — usar `aria-hidden` ou um único
   botão responsivo).
5. 🟡 **Formulário de OS** — mantém o botão salvar só no rodapé do cartão (mesmo padrão antigo do orçamento) e usa o
   mesmo `ItemsEditor`. Avaliar o mesmo layout de duas colunas + resumo fixo. *(a validar na tela)*
6. 🟡 **Orçamentos carrega a lista inteira no cliente** (a API não filtra por status/consultor). Funciona hoje, mas a
   busca/filtro novos escalam mal com milhares de registros; ideal é filtro no backend.
7. 🟡 **`Pagination`/tamanho de página** — OS tem seletor de tamanho, as demais não; padronizar.
8. 🟡 **Rótulos "Valor manual"/"Hora técnica"** — surgiram no editor de itens; replicar o selo de origem do preço na OS
   e no PDF interno para consistência.
9. 🟢 **Campos de 24 px** (`h-6`/`h-7`) nos editores inline abaixo do alvo de toque de 44 px; ver microinterações no
   editor de itens.
10. 🟢 **Contraste do `ink-muted` pequeno no tema escuro** — medir (meta 4,5:1); não medi.

## Validação sugerida
Passada com o app aberto, nesta ordem: OS (form e lista) → Agenda → Clientes/Veículos → Produtos → Dashboard.
Testar com 3–5 consultores o fluxo orçamento → aprovar no balcão → OS.
