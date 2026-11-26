# Revisão UX — Fluxo "Adicionar item ao orçamento"

Base: print enviado pelo usuário (item livre + itens já adicionados), `ItemsEditor.tsx` (modo `permitirItemLivre`) e a
tela rodando. Complementa `docs/orcamentos-ux-review.md`. Nada foi alterado em `src/` por este documento.

## Etapa 1 — Análise crítica

Como o fluxo funciona hoje: escolher tipo (Serviço / Peça / Item livre) → (catálogo) pesquisar e selecionar →
clicar **Adicionar** → uma linha nova aparece **na lista abaixo** → no item livre, preencher descrição, valor da peça e
acréscimo dentro da linha.

### Por que parece que "não tem botão de adicionar"
1. **O botão adiciona uma linha vazia, não um item.** No Item livre o "Adicionar" não pede nada: só cria uma linha em
   branco em outro lugar da tela. O verbo promete "adicionar o item", a ação real é "criar um rascunho de linha".
2. **Causa e efeito separados.** O botão está no cartão de cima; o resultado (a linha nova) entra no **fim** da lista,
   muitas vezes fora da área visível. O usuário clica e "nada acontece" naquele ponto da tela.
3. **Selo de tipo e botão têm a mesma cor.** O chip selecionado ("Item livre") e o "Adicionar" são ambos laranja cheio:
   dois elementos competem como ação principal; o chip parece botão e o botão parece parte do seletor.
4. **Não há "Adicionar" junto da lista.** Depois do primeiro item, quem quer mais um precisa voltar ao cartão de cima.

### Problemas de modelo mental / consistência (veja a linha "Liquido de arrefecimento" no print)
5. **Item livre aparece como Serviço**: ícone de chave inglesa e campo de **tempo vendido (00:00, +0:30…)** — mas o
   preço dele não vem de hora técnica, vem de "valor da peça + acréscimo". Duas formas de precificar misturadas na
   mesma linha. (No código, o `tipoItem` do item livre herda a aba, `SERVICO` por padrão.)
6. **Rótulo "Valor da peça"** num item que o ícone diz ser serviço. O mesmo bloco serve para peça e mão de obra avulsa
   e usa só o vocabulário de peça.
7. **Duas aparências para a mesma coisa**: item de catálogo = linha compacta `1 × 500 R$ 500,00`; item livre = linha +
   bloco grande "Como formar o preço". Alturas e densidade muito diferentes na mesma lista.
8. **Sem cabeçalho de colunas** (Qtd, Unitário, Total): "1 × 500" e a pílula "1" não dizem o que são.
9. **Erro tardio**: linha livre vazia (R$ 0,00, sem descrição) só reclama ao salvar; nem entra no checklist do painel.
10. **Precisa de 3 passos** para um item livre (tipo → Adicionar → procurar a linha e preencher) e 2 para catálogo
    (selecionar → Adicionar), sem atalho de teclado.

### Pontos bons (manter)
- A fórmula visível **valor + acréscimo = preço ao cliente, "Seu lucro"** é clara e o "só você vê" protege o interno.
- Rótulo de **origem do preço** ("Hora técnica", "Cadastro do produto").
- Foco automático na descrição da linha nova (visto no print).

## Etapa 2 — Score do fluxo atual

| Critério | Nota |
|---|---|
| Clareza | 5,0 |
| Usabilidade | 5,0 |
| Acessibilidade | 6,0 |
| Arquitetura da informação | 5,0 |
| Hierarquia visual | 4,5 |
| Eficiência operacional | 4,5 |
| Experiência do usuário | 5,0 |
| **Geral** | **5,0 / 10** |

## Etapa 3 — Severidade
1. 🔴 Botão adiciona linha vazia fora da área visível (causa e efeito separados).
2. 🔴 Item livre misturado com serviço (tempo vendido + vocabulário de peça).
3. 🟠 Chip de tipo e CTA com a mesma cor; sem "Adicionar" ao fim da lista.
4. 🟠 Linhas com duas densidades; sem cabeçalho de colunas.
5. 🟡 3 passos por item livre, sem atalho de teclado.
6. 🟡 Linha vazia só acusa erro ao salvar.
7. 🟢 Rótulo "Itens incluídos no orçamento" + contador redundantes.

## Etapa 4 — Veredito
O fluxo de **adicionar** deve ser redesenhado (a lista e a fórmula de preço podem ser mantidas). O problema não é
falta de botão e sim a ação "Adicionar" não produzir um item: a tela separa o ponto de entrada do ponto de resultado.

## Etapa 5 — Nova experiência
**O que muda**
1. **Um único campo de busca** no topo da lista: "Adicionar serviço, peça ou digitar item livre…". Resultados agrupados
   (Serviços · Peças) e, no fim, sempre **"+ Adicionar “texto digitado” como item livre"**. Enter adiciona.
2. Some o seletor de 3 chips + botão. Quem quer item livre sem digitar clica em **"+ Item livre"** ao lado do campo.
3. Item novo entra **no fim da lista com a linha rolada para a vista, realçada e com o foco no primeiro campo faltante**
   (descrição se livre; quantidade se catálogo).
4. **Botão "+ Adicionar item" repetido ao fim da lista**, para o segundo, terceiro item.
5. **Item livre ganha tipo próprio na linha**: segmentado pequeno *Serviço | Peça*. Peça: "Valor da peça + acréscimo".
   Serviço: "Valor do serviço" (tempo vendido só se for cobrado por hora técnica). Rótulos e ícones batem com o tipo.
6. **Uma só densidade de linha** com cabeçalho `Item · Qtd · Unitário · Total`; o bloco "Como formar o preço" vira
   detalhe **recolhível** ("Preço: R$ 69 + 14,8% = R$ 79,21 · lucro R$ 10,21 ▾"), aberto só na linha recém-criada.
7. Linha incompleta fica marcada (borda + "Falta descrição / valor") **na hora**, e vira pendência no painel de resumo.

**Benefícios ao usuário:** clicar/teclar e ver o item aparecer no mesmo lugar; 1 passo por item de catálogo, 1–2 para livre.
**Benefícios ao negócio:** cotação mais rápida com o cliente esperando; menos itens livres vazios/errados salvos.
**Atrito reduzido:** 3 passos → 1–2; some a "caça" à linha nova; some a dúvida de qual botão usar.

## Etapa 6 — Wireframe

```
ITENS                                                          3 itens · R$ 579,21
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔎 Adicionar serviço, peça ou digitar item livre…              [ + Item livre ]│
│   ┌ ao digitar "liq" ─────────────────────────────────────────────────────┐   │
│   │ SERVIÇOS   Troca de líquido de arrefecimento                          │   │
│   │ PEÇAS      Líquido de arrefecimento 1L · 12 disponíveis               │   │
│   │ ＋ Adicionar “liq” como item livre                           ⏎         │   │
│   └───────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
 Item                                         Qtd   Unitário       Total
 ─────────────────────────────────────────────────────────────────────────────
 🔧 Revisão preventiva básica                  1     R$ 500,00   R$ 500,00   ⧉ 🗑
    Origem: Hora técnica · 01:00 [+0:30][+1:00]
 ─────────────────────────────────────────────────────────────────────────────
 📦 Líquido de arrefecimento     [Peça|Serv]   1     R$ 79,21    R$ 79,21    ⧉ 🗑
    Preço: R$ 69,00 + 14,8% · lucro R$ 10,21                      ▾ editar
 ─────────────────────────────────────────────────────────────────────────────
 ▌ ⚠ [ Descrição…              ] [Peça|Serv]  1     —           R$ 0,00     ⧉ 🗑   ← realçada, foco aqui
 ▌   Valor da peça [      ] + Acréscimo [   ]% = Preço ao cliente R$ 0,00
 ─────────────────────────────────────────────────────────────────────────────
 [ + Adicionar item ]
```

## Etapa 7 — Design system
Reutiliza `Combobox` (estender com grupos e a opção fixa "item livre"), `Badge`, `IconActionButton`, `Input`, `Button`,
`SegmentedControl` (já existe em `components/ui`) e o `Disclosure` criado no passo anterior. Cores/tokens inalterados.
Para o botão: um único laranja cheio por tela (o CTA); o seletor de tipo, se mantido, usa estilo neutro/outline.
Novo componente só se necessário: cabeçalho de colunas da lista.

## Etapa 8 — Microinterações
- **Vazio:** "Digite um serviço ou peça. Ex.: troca de óleo, pastilha de freio" + atalho "+ Item livre".
- **Adicionado:** linha entra com realce de ~1 s e `scrollIntoView`; anúncio `aria-live`: "Item adicionado: Pastilha, R$ 0,00".
- **Hover/focus:** ações de linha (duplicar/remover) visíveis no foco por teclado; remover com **"Desfazer" 6 s**.
- **Erro:** borda e mensagem na linha ("Falta descrição"), contador no painel de resumo.
- **Preço (item livre):** fórmula atualiza em tempo real (já existe); lucro negativo em vermelho.
- **Loading:** skeleton de 3 resultados no dropdown enquanto o catálogo carrega.

## Etapa 9 — Acessibilidade
- Combobox com `role="combobox"`/`listbox`, grupos com `aria-label`, Enter/↑/↓/Esc.
- Alvos ≥ 44 px: hoje `inputInline` (`h-6`) e as pílulas `+0:30` ficam abaixo disso.
- Cabeçalho de colunas ligado às células (`aria-labelledby`) — hoje "1" e "500" não têm rótulo visível.
- Chips de estado nunca só por cor (ícone + texto).
- Contraste do texto `ink-muted` pequeno sobre fundo escuro: medir (meta 4,5:1).

## Etapa 10 — Resultado final
| | Antes | Depois (estimado) |
|---|---|---|
| Passos por item de catálogo | 2 | 1 |
| Passos por item livre | 3 | 1–2 |
| Causa e efeito no mesmo ponto | não | sim |
| "Adicionar" ao fim da lista | não | sim |
| Score UX | **5,0** | **8,4** |

**Ordem sugerida:** (1) botão "+ Adicionar item" no fim da lista + rolar/realçar a linha nova (rápido, sem mudar o modelo);
(2) tipo Serviço/Peça por linha no item livre (rótulos e ícone corretos, tempo vendido só onde cabe);
(3) cabeçalho de colunas + densidade única com preço recolhível; (4) busca única com grupos e "item livre" por texto;
(5) validação imediata de linha incompleta ligada ao painel.

**Pendências / a decidir:** item livre de *serviço* deve poder usar hora técnica, ou só valor fixo? (hoje o código herda
`tipoItem` da aba e mostra tempo vendido). Validar com 3–5 consultores se "Peça/Serviço" na linha é suficiente.
