# Reavaliação UX — Orçamento (depois das melhorias)

Compara com `orcamentos-ux-review.md` (nota 5,2) e `orcamentos-adicionar-item-ux.md` (nota 5,0).
Base: tela rodando em 1440×900 (Administrador) — novo orçamento com cliente, veículo, um serviço por hora técnica e um item
livre —, mais leitura do código. **Não revi ao vivo** a lista de Orçamentos (a sessão de teste expirou) nem o celular;
a lista foi avaliada pelo código e pelos testes.

## O que melhorou (verificado)

| Antes | Agora |
|---|---|
| Itens/total só depois de ~1000 px de rolagem (vistoria 3D no topo) | Itens e total na **primeira tela**; vistoria **recolhida** ("Vistoria de entrada (opcional) · Registrar avarias e combustível") |
| Sem total nem pendências à vista | **Painel de resumo fixo**: serviços / peças / itens livres / tempo / **Total**, e "Para enviar ao cliente" com ✓/○ |
| Salvar só no rodapé, ~1500 px abaixo | Botão **"Criar rascunho"/"Salvar alterações" no painel**, sempre visível |
| "Adicionar" criava linha vazia longe do botão | Linha nova **rola para a vista, realçada, com foco**; botões "Adicionar outro item livre" / "Adicionar do catálogo" **junto da lista** |
| Item livre parecia serviço (com horas) | **Peça/Serviço por linha**, rótulo e ícone corretos; bloco de preço **recolhível** com resumo |
| Lista de itens sem cabeçalho | Cabeçalho **Item · Qtd · Unitário · Total**, uma só densidade |
| Tempo só atualizava ao sair do campo; preço fixo sem explicação | Atualiza **ao digitar**; valor da hora do catálogo (R$ 450/h → 1:30 = R$ 675), blocos de 30 min, reprecificação ao escolher o veículo, explicação quando o preço é fixo |
| Lista de orçamentos sem busca/filtro/confirmação | Busca, chips de etapa com contagem, estado vazio com ação, confirmação ao rejeitar *(visto só em código/testes)* |
| Entrada vindo de Clientes/Veículos | `/orcamentos/novo?clienteId=…&veiculoId=…` abre com cliente/veículo escolhidos (visto: checklist já com "Cliente cadastrado ✓") |

## O que ainda incomoda

### Fluxo
1. **O checklist "Para enviar ao cliente" não leva a lugar nenhum.** Com tudo ✓ ele diz "salve e envie pela lista de
   orçamentos": **não há botão de enviar (nem "aprovar no balcão") no orçamento**; salva → volta à lista → procura a
   linha → clica no ícone. O painel promete e não entrega. 🟠
2. **Sem proteção contra perda de trabalho**: não há autosave real nem aviso ao sair com alterações
   (confirmado: nenhum bloqueio de navegação; clicar em outro item do menu descarta a cotação inteira). 🔴
3. **Trocar o cliente ainda apaga todos os itens** (e as avarias) sem confirmar nem "desfazer". 🟠
4. **Duas portas de entrada para itens** convivem: o cartão grande laranja no topo (3 chips + busca + Adicionar) e os
   botões novos ao fim da lista — o cartão ocupa ~25% da primeira tela mesmo quando já há itens. A busca única
   (serviço, peça ou "texto digitado = item livre") continua pendente. 🟠

### Informação / visual
5. **Barra "Mão de obra pela hora técnica (01:00): R$ 450,00"** abaixo da lista repete o que o resumo já mostra em
   "Serviços" e na linha do item. 🟡
6. **Validade (dias) e Entrada do veículo** ainda têm peso de campo principal logo no topo (a segunda vem preenchida
   com "agora" e a dica é uma métrica interna). 🟡
7. **Linha do item livre ainda tem 3 faixas** (descrição, resumo do preço, bloco aberto no item novo); com muitos
   itens livres a lista fica longa. 🟡
8. **Rótulo "Criar rascunho"** — o usuário quer "Salvar"; rascunho é detalhe de status. 🟢
9. **Painel no celular** desce para o fim da página (sticky só em `lg`): sem barra fixa de total + salvar. 🟡

### Acessibilidade (não medido)
10. Contraste do `ink-muted` pequeno no escuro; alvos 24 px dos campos inline (`h-6`) e das pílulas de tempo (+0:30). 🟢

## Score UX

| Critério | Antes | Agora |
|---|---|---|
| Clareza | 6,5 | 7,5 |
| Usabilidade | 5,5 | 7,0 |
| Acessibilidade | 6,0 | 7,0 |
| Arquitetura da informação | 4,5 | 7,5 |
| Hierarquia visual | 4,5 | 7,0 |
| Eficiência operacional | 4,5 | 6,5 |
| Experiência do usuário | 5,0 | 7,2 |
| **Geral** | **5,2** | **7,1 / 10** |

Teto estimado com o backlog abaixo: **~8,4**.

## Backlog priorizado (próximos passos)
1. 🔴 **Proteção contra perda**: aviso ao sair com alterações (bloqueio de navegação) e, melhor, **autosave** do
   rascunho com indicador "Salvo às HH:MM".
2. 🟠 **Fechar o fluxo no painel**: "Salvar e enviar (WhatsApp)" e "Aprovar no balcão" quando o checklist estiver ✓ (as
   ações já existem na lista — reaproveitar; cuidado com o bloqueio de envio sem cadastro).
3. 🟠 **Trocar cliente sem apagar itens** (reprecificar só os de hora técnica) ou, no mínimo, confirmar com "Desfazer".
4. 🟠 **Busca única de itens** e redução do cartão superior quando já houver itens.
5. 🟡 Mover Validade/Entrada para "Mais opções"; remover a barra "Mão de obra pela hora técnica"; rótulo "Salvar".
6. 🟡 Barra fixa de total + salvar no celular; medir contraste e alvos de toque.

## Observação de processo
Os itens 1 e 3 não dependem do backend. O item 2 depende de decidir se "enviar" deve exigir cliente cadastrado
(hoje exige — 422 do backend) e de como tratar o orçamento "Ainda não cadastrado" no mesmo botão.

Nada foi alterado em `src/` por esta reavaliação.
