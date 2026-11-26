# Revisão UX — Tela "Novo orçamento" (`/orcamentos/novo`)

Papel aplicado: Product Designer Sênior / UX Researcher / Arquitetura de Informação (prompt de 10 etapas).
Base: leitura de `OrcamentoFormPage.tsx` e `ItemsEditor.tsx`, mais a tela rodando em 1440×900 (tema escuro, perfil
Administrador, orçamento vazio). Não testei mobile, nem a tela de edição de orçamento enviado/aprovado, nem a lista.
Complementa `docs/orcamentos-redesenho.md` (que cobre processo e modelo de dados; aqui o foco é a tela).

## Etapa 1 — Análise crítica

**Fato central medido:** a página tem ~1655 px de altura e a tarefa principal — **montar os itens e ver o total** —
só começa por volta de y≈1000, depois de identificação + vistoria 3D. Num notebook (~800 px úteis) o consultor
precisa de **duas rolagens** para fazer o que veio fazer. Quando chega lá, não há total visível (só aparece com itens).

### Problemas de usabilidade / fluxo
- Ordem invertida em relação à tarefa: identificar → **vistoria 3D** → itens → observações. A vistoria (avarias do
  veículo) é uma atividade da *recepção do veículo*, não da *cotação*; ocupa o primeiro "andar" da tela mesmo vazia.
- Tudo-ou-nada: um único "Criar rascunho" no rodapé, a ~1500 px do topo, sem barra fixa. O autosave só ocorre em
  caminhos escondidos (desconto/reserva), e então aparece um toast "Rascunho salvo automaticamente" sem o usuário ter
  pedido — comportamento imprevisível.
- Campos de baixo valor com peso de campo principal: "Validade (dias)" e "Entrada do veículo" (data/hora já preenchida
  com "agora", dica "Usada no tempo de resposta" — é métrica interna do negócio, não dado do orçamento do cliente).
- Mensagem "Dá para montar e salvar o rascunho agora. Para enviar ao cliente é preciso vincular…" aparece só no modo
  "Ainda não cadastrado": o bloqueio de envio é revelado cedo (bom), mas o que *falta* não é listado.
- Trocar de cliente **apaga todos os itens** sem confirmação (`setValue('itens', [])`) — destrutivo e silencioso
  (há toast só para as avarias).
- Cliente → Veículo em cascata: veículo fica desabilitado até escolher o cliente. Correto, mas o caso mais comum numa
  oficina é o cliente chegar **com a placa na mão**; a tela não oferece "digitar placa" como porta de entrada no modo
  cadastrado (a consulta de placa existe no projeto — `PlacaHero` — mas não é a entrada daqui).
- Papéis do veículo avulso vs. cadastrado duplicam seções diferentes (`VeiculoAvulsoSecao` × bloco "Dados do veículo"),
  gerando duas telas parecidas dentro da mesma página.
- Área "Adicionar item": 3 abas (Serviço / Peça / Item livre) + busca + botão "Adicionar" desabilitado até escolher.
  São 2 passos (escolher, clicar Adicionar) onde Enter na seleção bastaria; "Item livre" cria uma linha em branco para
  preencher depois (3 passos).

### Problemas visuais
- Fold dominado por um canvas 3D grande + velocímetro de combustível: é o elemento mais chamativo da tela, mas é o
  menos frequente no uso diário de cotação. Hierarquia invertida.
- O cartão de "Adicionar item" tem borda/fundo em laranja de destaque, mas fica abaixo da dobra — a única área
  chamativa certa está no lugar errado.
- Duas escalas de campo coexistem em itens (`campoDestaque` h-10 com borda 2px vs. `inputInline` h-6 sem borda):
  linhas de item livre e de catálogo parecem de sistemas diferentes.
- "Itens incluídos no orçamento" é um rótulo pequeno cinza; o contador "0" em pílula repete informação do estado vazio.

### Problemas cognitivos
- Três modelos mentais na mesma tela: cadastro (cliente/veículo), recepção (vistoria/entrada) e comercial (itens/preço).
- Nenhum feedback de progresso: o usuário não sabe o que falta para poder **enviar** (cliente? veículo? itens?).
- Rótulos de origem do preço ("Valor manual", "Hora técnica", "Cadastro do produto") são ótimos para confiança, mas
  só aparecem depois — vale manter como padrão.

## Etapa 2 — Score UX (tela atual)

| Critério | Nota |
|---|---|
| Clareza | 6,5 |
| Usabilidade | 5,5 |
| Acessibilidade | 6,0 (não medi contraste; o design system escuro usa texto `ink-muted` pequeno — conferir) |
| Arquitetura da informação | 4,5 |
| Hierarquia visual | 4,5 |
| Eficiência operacional | 4,5 |
| Experiência do usuário | 5,0 |
| **Geral** | **5,2 / 10** |

## Etapa 3 — Severidade

1. 🔴 **Crítico** — Tarefa principal (itens/total) escondida abaixo de ~1000 px; vistoria 3D ocupa o fold.
2. 🔴 **Crítico** — Salvar tudo-ou-nada, sem barra fixa e sem autosave previsível (risco de perder cotação).
3. 🟠 **Alto** — Trocar o cliente apaga todos os itens sem confirmar nem permitir desfazer.
4. 🟠 **Alto** — Sem total/resumo persistente: o consultor negocia preço olhando uma lista, não um total.
5. 🟠 **Alto** — Sem indicação do que falta para poder enviar ao cliente.
6. 🟡 **Médio** — Validade e Entrada do veículo com peso de campo principal.
7. 🟡 **Médio** — Adicionar item em 2–3 passos; sem atalho de teclado.
8. 🟡 **Médio** — Entrada por placa ausente no modo cadastrado.
9. 🟢 **Baixo** — Dois tamanhos de campo no editor de itens; rótulo/contador redundantes.

## Etapa 4 — Veredito

O fluxo está **inadequado ao objetivo** (cotar rápido). Não é um problema de acabamento, é de estrutura: a tela é
organizada pela *entidade* (cliente, veículo, vistoria, itens) e não pela *tarefa* (cotar → enviar). Recomendo
**substituir a estrutura**, reaproveitando os componentes existentes.

## Etapa 5 — Nova experiência

**O que muda**
1. Layout em **duas colunas**: à esquerda o trabalho (cliente/placa → itens); à direita um **painel fixo** com resumo,
   pendências e ações (Salvar, Enviar).
2. A **vistoria vira uma etapa opcional recolhida** ("Registrar avarias na entrada", abre sob demanda) — não é mais o
   primeiro bloco.
3. Cabeçalho do orçamento enxuto: **cliente + veículo** num único cartão-resumo editável; validade/entrada em "Mais
   opções".
4. **Autosave** com indicador de estado ("Salvo às 12:15") em vez de toast surpresa; "Criar rascunho" deixa de existir
   como ritual.
5. **Busca única de itens** (serviço, peça e livre juntos), Enter adiciona; "Adicionar “texto” como item livre".
6. Trocar cliente **mantém os itens** (reprecifica só hora técnica) com aviso e "Desfazer".

**Por quê:** a hierarquia passa a seguir a frequência de uso; o total fica sempre à vista; o risco de perda some.

**Benefícios ao usuário:** menos rolagem, menos cliques por item, menos medo de perder trabalho, sabe o que falta.
**Benefícios ao negócio:** cotação mais rápida enquanto o cliente espera → mais orçamentos enviados e aprovados;
métrica de tempo de resposta continua existindo (campo opcional).
**Atrito reduzido:** 3 rolagens → 0–1; 3 passos por item → 1; salvar manual → contínuo.

## Etapa 6 — Wireframe (desktop ≥1280 px)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Novo orçamento  · Consultor: Diego            ● Salvo às 12:15             [Voltar]      │
├───────────────────────────────────────────────────────────┬─────────────────────────────┤
│ CLIENTE E VEÍCULO                                         │ RESUMO (fixo ao rolar)      │
│ ┌───────────────────────────────────────────────────────┐ │                             │
│ │ (•) Cadastrado  ( ) Ainda não cadastrado              │ │ Serviços         R$ 0,00    │
│ │ [🔎 Placa, nome ou CPF/CNPJ ...                    ]  │ │ Peças            R$ 0,00    │
│ │ ── ou, escolhido: ──                                  │ │ Itens livres     R$ 0,00    │
│ │ João Silva · ABC1D23 · Honda CG 160 · Cat. B   [Trocar]│ │ ───────────────────────     │
│ └───────────────────────────────────────────────────────┘ │ TOTAL            R$ 0,00    │
│ ▸ Mais opções: validade (7 dias) · entrada do veículo     │                             │
├───────────────────────────────────────────────────────────┤ Para enviar falta:          │
│ ITENS                                                     │  ○ Cliente  ○ Veículo       │
│ [🔎 Buscar serviço, peça ou digitar item livre...  ⏎ ]    │  ○ ao menos 1 item          │
│ ┌───────────────────────────────────────────────────────┐ │                             │
│ │ Estado vazio: "Comece digitando um serviço ou peça.   │ │ [ Enviar ao cliente ]       │
│ │ Ex.: troca de óleo, pastilha de freio."               │ │ [ Salvar e sair ]           │
│ └───────────────────────────────────────────────────────┘ │                             │
│ Linhas: descrição · qtd · valor · origem do preço · ⋯     │ ▸ Painel interno (custo/    │
├───────────────────────────────────────────────────────────┤   margem) — só com permissão│
│ ▸ Vistoria de entrada (opcional) — 0 avarias  [Abrir]     │                             │
│ ▸ Observações                                             │                             │
└───────────────────────────────────────────────────────────┴─────────────────────────────┘
Mobile: coluna única; resumo vira barra inferior fixa "Total R$ … · Enviar".
```

## Etapa 7 — Design system

Tudo reaproveitável: `PageHeader`, `Card`, `Combobox`, `Badge`, `Input/Textarea`, `Button`, `Tabs`, `ItemsEditor`
(inclui `origemDoValor`, `resumoCustoLucro`, `totaisPorTipo`), `VistoriaEntrada`, `ConsultorBadge`, `SeletorModoCliente`,
`ConcluirCadastroModal`. Paleta, tipografia e tokens (`brand-*`, `surface-alt`, `ink-muted`, `border`) não mudam.
**Novos (justificados):** (a) `ResumoOrcamentoPanel` — sticky, hoje o total só existe dentro do editor; (b) `ChecklistEnvio`
— lista de pendências para enviar; (c) indicador de autosave; (d) `Disclosure` simples para "Mais opções"/vistoria se
não houver um equivalente (verificar antes de criar).

## Etapa 8 — Microinterações
- **Vazio:** itens com exemplos reais da oficina; resumo em "R$ 0,00" cinza, não escondido.
- **Loading/skeleton:** skeleton no cartão de cliente e nas linhas ao carregar edição (hoje: `PageSpinner` de tela inteira).
- **Hover/focus:** linha de item com realce e ações (duplicar/remover) visíveis no foco por teclado, não só no hover.
- **Feedback:** valor do total anima ±(contador curto) ao mudar; linha nova recebe flash de realce e foco no campo qtd.
- **Sucesso:** "Salvo às HH:MM" discreto; envio mostra confirmação com link/WhatsApp.
- **Erro:** erro inline por campo + resumo no painel ("2 pendências"); falha de autosave vira faixa persistente com
  "Tentar de novo" (não só toast).
- **Confirmações:** trocar cliente com itens → "Manter itens e reprecificar" (padrão) ou "Limpar"; remover item → "Desfazer" 6 s.

## Etapa 9 — Acessibilidade (verificar na implementação)
- Contraste de `ink-muted` pequeno sobre `surface-alt` no tema escuro: **medir** (meta 4,5:1).
- Alvos de toque ≥ 44 px: `inputInline` (`h-6`) e pílulas de tempo (`+0:30`) estão abaixo disso.
- Teclado: busca de itens com `Enter` para adicionar, `Esc` para limpar; ordem de tab: cliente → itens → resumo.
- Leitor de tela: `aria-live="polite"` no total e no "Salvo às…"; erro de lista de itens ligado por `aria-describedby`.
- Canvas 3D da vistoria precisa de alternativa por teclado (já existe "Adicionar manual" — manter e documentar).
- Estados nunca só por cor: pendências com ícone + texto.

## Etapa 10 — Resultado final

| | Antes | Depois (estimado) |
|---|---|---|
| Rolagens até o primeiro item | 2 | 0 |
| Passos por item de catálogo | 2 (escolher + Adicionar) | 1 |
| Total visível | só com itens, no fim | sempre, fixo |
| Salvamento | manual, no rodapé | contínuo |
| Score UX | **5,2** | **8,3** |

**Ordem sugerida de implementação** (do maior ganho/menor risco): (1) painel de resumo fixo + barra de ação fixa;
(2) mover vistoria e observações para blocos recolhidos abaixo dos itens; (3) busca única de itens com Enter;
(4) trocar cliente sem apagar itens; (5) autosave com indicador; (6) cartão-resumo cliente+veículo e entrada por placa.

**Fora do escopo desta revisão / a validar com usuários reais:** se o consultor realmente faz vistoria no mesmo
momento da cotação (se sim, subir um pouco o bloco, mas ainda recolhido); testes de usabilidade com 3–5 consultores.
Nada foi alterado em `src/` — este documento é só análise e proposta.
