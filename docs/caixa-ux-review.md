# Revisão UX — Meu Caixa (fluxo completo)

Escopo: **todo o ciclo do caixa** — abrir turno → vender/faturar/lançar → baixar contas → conferir → fechar → consulta
posterior (gerente). Arquivos lidos: `MeuCaixaPage`, `AbrirCaixaModal`, `RegistrarMovimentoModal`, `VenderProdutoModal`,
`useVendaCaixa`, `FaturarOSModal` (+ o "Faturar no Caixa" do detalhe da O.S.), `OfertaEmissaoNfse`, `ContasDoDiaCard`,
`BaixaContaModal`, `FecharCaixaModal`, e as abas do gerente em Financeiro (`CaixaSessoesTab`, `CaixaSessaoDetalheModal`,
`CaixaAuditoriaTab`, `CaixaRelatoriosTab`), mais as regras do backend (`CaixaSessaoService`, `CaixaMovimentoService`) e
os endpoints do `openapi.json`.
Visto rodando (Administrador, 1440×900): tela com caixa aberto, modal **Faturar OS** (vazio) e modal **Fechar caixa**.
**Não vi ao vivo**: abertura de turno, Nova entrada/saída, Vender produtos, Baixa de conta, abas do gerente, celular,
nem o perfil "só operador de caixa" — esses ficam avaliados por código/regras ("a validar").

## Regras do backend que moldam a tela (confirmadas no código)
- **Há UM caixa físico por oficina** (`findByTenantIdAndStatus ABERTO`): abrir com outro aberto dá erro
  "Já existe um caixa aberto… Feche-o antes".
- `buscarAberta` é **compartilhado** (quem tem `CAIXA_OPERAR` vê o turno aberto de qualquer um), mas
  **fechar/ver detalhe exige ser o dono** (ou `CAIXA_GERENCIAR`) → 403 "Você só pode ver/gerenciar os próprios caixas".
- Lançamento manual e recebimento **exigem caixa aberto** ("Não há caixa aberto. Abra um caixa antes…").
- Fechar com divergência exige justificativa; **reabrir é só de quem gerencia**.
- **Não existe** endpoint de estorno/cancelamento de lançamento, sangria/suprimento, nem de desfazer faturamento.

## Etapa 1 — Análise crítica (por etapa do fluxo)

### 0. Visão geral / nome
1. **"Meu Caixa" promete uma coisa e é outra**: é *o* caixa da oficina (único, compartilhado). O cabeçalho mostra turno e
   hora de abertura, mas **não quem abriu**. Um operador que não abriu vê "Fechar caixa" e só descobre pelo 403 que não
   pode. 🟠
2. **Quem precisa de caixa aberto não é avisado**: Faturar pelo detalhe da O.S., baixar conta e lançar dependem de um
   turno aberto, mas só falham com erro do backend. Não há alerta global "caixa fechado" nem atalho "Abrir caixa". 🟠

### 1. Abrir caixa
3. O modal pede **Turno** em texto livre ("Manhã, Tarde…") e quatro saldos iniciais (Dinheiro, Cartão, Pix,
   Transferência). Em oficina o troco inicial é quase sempre só **dinheiro**; Cartão/Pix/Transferência como "saldo
   inicial" são raros e geram dúvida. Turno livre gera nomes inconsistentes ("manhã", "Manha"). 🟡
4. Sem **resumo do turno anterior** ("O último caixa fechou com R$ 350 em dinheiro — usar como saldo inicial?"): o saldo
   inicial é digitado de memória. 🟡

### 2. Turno aberto (tela principal)
5. **Bom**: KPIs claros (inicial/entradas/saídas/saldo atual), ações grandes, saldo por forma de pagamento. 🟢
6. **"Faturar OS" é o botão mais importante do dia e o menos ajudado**: abre uma busca vazia que exige **CPF/CNPJ ou nº
   da O.S.**. O caixa não sabe o CPF; quer ver **"O.S. prontas para faturar"** (o Dashboard já diz "10 prontas p/
   faturar"). Hoje: pedir o número ao consultor, digitar, buscar, selecionar, "Faturar OS", escolher forma, confirmar. 🔴
7. **Card "Contas para baixar" vazio ocupa ~30 % da tela** (estado vazio alto) e **empurra os lançamentos do turno para
   baixo da dobra** — o registro do que aconteceu fica escondido. 🟠
8. **"Fechar caixa" em vermelho cheio no topo**, ao lado de "Atualizar": ação rara e irreversível (só gerente reabre)
   com o mesmo peso de uma ação do dia a dia. 🟠
9. Lançamentos: sem busca/filtro (entradas × saídas × forma), sem totais por tipo, descrições internas ("Recebimento:
   Serviço prestado - OS #OS-000006"), **sem como corrigir um lançamento errado** (não existe estorno). 🟠

### 3. Nova entrada / saída
10. Modal simples e correto (saída exige justificativa; categoria opcional). Falta: **sangria** (retirar dinheiro do caixa
    para o cofre) e **suprimento** (reforço de troco) como tipos próprios — hoje viram "Nova saída/entrada" genéricas,
    sem rastro de que não é despesa nem receita. 🟡
11. Categoria vira texto na frente da descrição (`[Categoria] texto`): o backend recebe sempre `OUTRO`; relatório por
    categoria não é possível. 🟡
12. Salvar não pede **confirmação do valor** (digitar 1500 em vez de 150,0 é um lançamento sem volta). 🟡

### 4. Vender produtos (balcão)
13. Fluxo bom (busca, carrinho, limite de estoque, total). Faltam: **desconto**, **valor recebido e troco** (dinheiro),
    **pagamento misto** (parte Pix, parte dinheiro) e **recibo/comprovante**; carrinho some ao fechar o modal sem aviso. 🟡
14. A venda é **composta no front** (uma saída de estoque por item + uma entrada no caixa) com estorno manual se falhar.
    Funciona, mas é **frágil**: queda de rede entre passos pode deixar estoque baixado sem entrada (o código avisa,
    mas depende de acerto manual) e a venda não tem registro próprio (só "Venda de produtos: 2x X"). 🟠 *(a validar)*

### 5. Faturar O.S. (dois caminhos)
15. **Dois caminhos diferentes** para a mesma ação: pelo Meu Caixa (busca → resumo → forma → recibo automático + convite
    NFS-e) e pelo detalhe da O.S. (modal mínimo: só a forma de pagamento, sem recibo automático). Experiências
    divergentes para o mesmo evento financeiro. 🟠
16. **Uma única forma de pagamento por O.S.**: cliente que paga parte no cartão e parte em dinheiro/Pix não cabe. 🟠
17. O recibo abre em **nova aba** (pop-up) e o toast diz "lançados no caixa CAIXA_20261126_TURNO1" (identificador
    técnico). Se o pop-up for bloqueado, o recibo se perde. 🟡
18. Depois de faturar, o convite "OS faturada. Emitir NFS-e agora?" é bom, mas **só aparece no caminho do Meu Caixa**. 🟡

### 6. Contas para baixar
19. Útil e bem explicado (baixa lançada no caixa e no Financeiro), mas **só aparece para quem tem FINANCEIRO**; o ícone
    de ação é um check colorido por tipo (vermelho = pagar) sem rótulo visível ("Pagar/Receber …" só no tooltip). 🟡

### 7. Fechar caixa  ← o ponto mais sensível
20. 🔴 **A "conferência" já vem preenchida com o valor do sistema**: o modal abre com Dinheiro 350, Cartão 929,9… e
    "**Divergência total R$ 0,00 ✓**" em verde, e ao lado de cada campo mostra "Sistema: R$ …". Dá para fechar com um
    clique **sem contar nada**. O propósito do fechamento é comparar o contado com o calculado — **conferência cega**
    (informar o contado sem ver o esperado) é o padrão de controle. Isso anula a auditoria e esconde furo de caixa.
21. Não mostra o **resumo do turno** antes de fechar (entradas/saídas por forma, nº de lançamentos, itens pendentes).
    Fechar é um botão vermelho no rodapé, sem etapa de revisão/confirmação. 🟠
22. **Depois de fechar** a tela volta ao estado "Nenhum caixa aberto" e o operador fica **sem comprovante** do que
    fechou; exportar PDF/Excel só existe na área do gerente. 🟠
23. Contagem só do total por forma: **sem contagem de cédulas** (nem precisa) — mas também sem salvar rascunho da
    contagem (digitou, fechou o modal, perdeu). 🟢

### 8. Consulta posterior (gerente)
24. As abas **Todos os Caixas / Auditoria / Relatórios** são completas (divergência, reaberturas, exportação). Faltam
    ações de gestão no detalhe: **ver os lançamentos** da sessão e **corrigir/estornar** (a tabela mostra só saldos por
    forma e eventos). 🟡 *(a validar)*
25. Permissões: o operador **só vê lançamentos com `FINANCEIRO_READ`**; sem ele a tela diz para pedir a permissão.
    Operador sem leitura não consegue conferir o que lançou. 🟠

### Acessibilidade e desempenho
26. Botões de 40 px (grandes ações 48 px ok); estados com texto (sem depender de cor), foco do modal já corrigido na
    rodada anterior. Pontos a validar: campos numéricos com setas nativas (rolar o mouse muda o valor), `type=number`
    para dinheiro sem máscara, contraste do `ink-muted`. 🟢
27. `Atualizar` manual: o turno não se atualiza sozinho quando outro operador lança (há só um caixa, mas vários
    usuários). 🟡

## Etapa 2 — Score UX

| Critério | Nota |
|---|---|
| Clareza | 6,5 |
| Usabilidade | 5,5 |
| Acessibilidade | 6,5 |
| Arquitetura da informação | 5,5 |
| Hierarquia visual | 5,5 |
| Eficiência operacional | 4,5 (faturar e fechar) |
| Experiência do usuário | 5,3 |
| **Geral** | **5,6 / 10** |

## Etapa 3 — Severidade
1. 🔴 Fechamento com contagem pré-preenchida e valor do sistema à vista (#20) · 🔴 Faturar O.S. sem lista de prontas (#6)
2. 🟠 Quem abriu não aparece / Fechar visível para quem não pode (#1) · sem aviso de caixa fechado (#2) · card vazio empurra
   lançamentos (#7) · Fechar em destaque (#8) · lançamento sem estorno (#9) · dois caminhos de faturar (#15) · uma forma
   por O.S. (#16) · sem resumo/confirmação/comprovante ao fechar (#21, #22) · venda composta no front (#14) · operador sem
   FINANCEIRO_READ não vê o que lançou (#25)
3. 🟡 #3, #4, #10–#13, #17–#19, #24, #27
4. 🟢 #5, #23, #26

## Etapa 4 — Veredito
O **núcleo está sólido** (um caixa, eventos de auditoria, divergência com justificativa, conferência por forma), mas o
**fluxo de trabalho do dia a dia** (faturar) e o **controle** (fechar) têm falhas de projeto, não de acabamento.
Recomendo **redesenhar o fechamento (conferência cega + revisão) e o faturamento (fila de O.S. prontas)**, manter o resto
com ajustes.

## Etapa 5 — Nova experiência
1. **Cabeçalho do turno**: "CAIXA_…TURNO1 · aberto por **Diego** às 11:26 · **R$ 1.359,90 em caixa**"; "Fechar caixa"
   vira ação secundária (menu ⋯ ou botão discreto) e só aparece para quem pode (dono/gerente), com a explicação se não puder.
2. **Faturar O.S. = fila**: card/lista "**O.S. prontas para faturar (10)**" com cliente, placa, valor e botão **Receber**;
   a busca por CPF/número vira um filtro dessa fila. Mesmo modal de recebimento no Meu Caixa **e** no detalhe da O.S.
3. **Recebimento com pagamento misto**: linhas "forma + valor" até fechar o total, "valor recebido" e **troco** em
   dinheiro, confirmação com resumo e recibo (abrir/baixar/WhatsApp), toast sem identificador técnico.
4. **Atividades e lançamentos primeiro**: "Lançamentos do turno" sobe; "Contas para baixar" só aparece **quando há contas**
   (ou recolhido com contador "0 pendentes").
5. **Sangria / Suprimento** como tipos de lançamento (rótulo próprio, justificativa obrigatória, não contam como
   receita/despesa).
6. **Estorno com motivo** (e perfil/aprovação) em vez de "lançar o contrário" — com rastro de quem e por quê. *(exige backend)*
7. **Fechar em 3 passos**: (a) **contagem cega** — campos **vazios** por forma, sem mostrar "Sistema" nem divergência
   enquanto digita; (b) **revisão**: resumo do turno + comparação contado × sistema só agora, com justificativa obrigatória
   se divergir; (c) **confirmação** ("Fechar CAIXA_…TURNO1?") e, depois, **comprovante** (PDF) para o operador.
8. **Abrir caixa** com "sugerir saldo do último fechamento (dinheiro)", turno como seleção (Manhã/Tarde/Noite/Único), só
   dinheiro em destaque (demais formas em "outros saldos").
9. **Aviso global**: faixa "Caixa fechado — abra para receber" onde a ação financeira falha (faturar, baixar, vender),
   com botão que leva ao Meu Caixa.
10. **Atualização automática** do turno (polling leve) e rótulo de "atualizado às HH:MM".

**Benefícios:** menos tempo por recebimento; fechamento confiável; menos erro de lançamento; rastro para o gerente.
**Negócio:** redução de furo de caixa não percebido, recibo ao cliente, faturamento sem esquecimento (as 10 O.S. do
dashboard).

## Etapa 6 — Wireframe (tela principal)

```
Meu Caixa     CAIXA_20261126_TURNO1 · aberto por Diego às 11:26 · ● Aberto      [↻ 15:40]   [ ⋯ ]  ← Fechar caixa
┌ Saldo inicial R$ 200 ┐┌ Entradas R$ 1.159,90 ┐┌ Saídas R$ 0 ┐┌ Em caixa R$ 1.359,90 ┐
[ + Entrada ] [ − Saída ] [ Sangria ] [ Vender produtos ]
┌ O.S. prontas para faturar (10) ───────────────────────────────── 🔎 placa, nome, CPF ┐
│ O.S. 000040  Fernanda S. · MTG0002 · Onix        R$ 500,00           [ Receber ]       │
│ O.S. 000036  Rodrigo M. · MTG0003 · Argo         R$ 1.144,90         [ Receber ]       │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌ Lançamentos do turno   [Todos ▾] [Forma ▾]   Entradas R$ 1.159,90 · Saídas R$ 0 ──────┐
│ 11:26  Entrada  Recebimento O.S. 000006     Cartão   +R$ 929,90                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
▸ Contas para baixar (0)                                      (recolhido quando vazio)
```
Fechar (3 passos): `1 Contagem` (campos vazios) → `2 Revisão` (resumo + contado × sistema) → `3 Confirmar` → comprovante.

## Etapa 7 — Design system
Reutiliza `StatCard`, `Card`, `DataTable` (linha focável), `Modal` (foco), `SegmentedControl`, `Disclosure` (contas
recolhidas), `Badge`, `ConfirmDialog`, `SearchInput`, tokens de status. Novos: **stepper de 3 passos** do fechamento,
**linha de pagamento** (forma + valor) para o pagamento misto, e **menu "⋯"** (ainda não existe).

## Etapa 8 — Microinterações
Total e **troco** em tempo real; foco no campo de valor ao abrir; teclado (Enter confirma, Esc cancela);
"Recebido!" com recibo e botão "Próxima"; skeleton no turno; aviso ao tentar fechar o modal com contagem digitada;
atualização com "há 2 min"; destaque (flash) no lançamento novo.

## Etapa 9 — Acessibilidade
Contagem cega com `aria-describedby` sem revelar o esperado; stepper como lista ordenada com `aria-current`; valores
monetários com `inputmode="decimal"` e máscara (evita rolagem alterar o número); estados "Aberto/Fechado", "Sobrou/Faltou"
com texto; alvos ≥ 44 px; ações de linha com rótulo visível.

## Etapa 10 — Resultado final

| | Antes | Depois (estimado) |
|---|---|---|
| Receber uma O.S. | digitar CPF/nº → buscar → selecionar → faturar → forma → confirmar | **1 clique na fila** → forma/valor → confirmar |
| Fechamento | 1 clique, contagem pré-preenchida | contagem cega → revisão → confirmação → comprovante |
| Pagamento misto / troco | não | sim |
| Quem pode fechar | descoberto pelo 403 | explícito no cabeçalho |
| Lançamento errado | sem correção | estorno com motivo (backend) |
| Score UX | **5,6** | **8,5** |

## Ordem sugerida (do maior ganho/menor risco)
1. 🔴 **Fechamento com contagem cega + revisão + confirmação** (só front; muda o controle financeiro).
2. 🔴 **Fila "O.S. prontas para faturar"** no Meu Caixa (usa `GET /ordens-servico?status=CONCLUIDA`) e **um só modal de
   recebimento** nos dois caminhos.
3. 🟠 Cabeçalho com **quem abriu** + esconder/explicar "Fechar" para quem não é dono; card de contas recolhido quando vazio.
4. 🟠 Aviso global de caixa fechado com atalho para abrir.
5. 🟡 Abrir caixa (turno por seleção, sugestão do saldo anterior); Lançamentos com filtro/totais.
6. 🟡 Pagamento misto/troco e comprovante da venda; sangria/suprimento.
7. 🟠 *(backend)* estorno com motivo; venda de balcão como operação única e atômica.

## A verificar antes de implementar
- O backend aceita **vários pagamentos** no `POST /caixa/faturamento/{id}` (hoje só `formaPagamento`)? Pagamento misto
  provavelmente exige mudança de API.
- Como o backend trata **sangria/suprimento** (categoria nova ou só `OUTRO`)? Hoje `categoria` é VENDA_OS,
  PAGAMENTO_CONTA, RECEBIMENTO_CONTA, OUTRO.
- Existe regra de **quem pode fechar**: confirmado dono ou `CAIXA_GERENCIAR`; o front pode ler `abertoPorUsuarioId` da
  sessão aberta para esconder o botão (conferir o campo na resposta de `/sessoes/aberta`).
- O operador de caixa tem `ORDEM_SERVICO_READ` para a fila? (o modal atual já depende dessa permissão no backend).
- Há como o backend **bloquear fechar** se há O.S. faturada sem recibo, ou conta/baixa pendente? (regra de negócio).

Nada foi alterado em `src/` por esta revisão.
