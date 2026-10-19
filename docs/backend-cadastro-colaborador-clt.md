# Backend: cadastro completo de usuário/colaborador (CLT) — fase 1

Contexto: hoje `UsuarioRequest`/`UsuarioResponse` (spec ao vivo, conferida em 17/10/2026) só têm
`nome`, `email`, `senha`, `confirmacaoSenha`, `perfilId`, `ativo`. O front (modal de usuário em
abas) já envia/lê os campos abaixo e trata todos como **opcionais** — um campo ausente na resposta
vira vazio na tela, então o front funciona antes e depois do backend publicar.

Decisão de modelagem sugerida: manter tudo no mesmo recurso `/api/v1/usuarios` (campos planos,
mesmo padrão de `ClienteRequest`: `logradouro`, `numero`, `cep`...). Se preferir uma tabela
`colaborador` 1‑1 com `usuario`, o contrato JSON abaixo continua o mesmo.

## Regras gerais

- **Obrigatórios continuam sendo só** `nome`, `email`, `perfilId` (+ `senha` na criação). Nenhum dado
  de RH pode bloquear a criação de um acesso ao sistema.
- Máscaras **não** vão no payload: `cpf`, `pisPasep`, `cep`, `telefone`, `celular` e
  `contatoEmergenciaTelefone` chegam só com dígitos. Datas em ISO `yyyy-MM-dd`.
- Campo vazio no front é enviado como ausente/`null`; o PUT atual é "substitui tudo", então `null`
  limpa o campo.
- Validar no servidor (o front valida só para UX): dígito verificador de `cpf` e `pisPasep`,
  `uf` ∈ siglas válidas, `dataNascimento` não futura e idade ≥ 14, `dataDemissao` ≥ `dataAdmissao`,
  `jornadaSemanalHoras` entre 1 e 44 (limite CLT), `salario` ≥ 0.
- `cpf` único por oficina (multi-tenant) → 409 com código de negócio, ex. `CPF_JA_CADASTRADO`.

## Campos (em `UsuarioRequest` e `UsuarioResponse`)

```json
{
  "cpf": "12345678909",
  "rg": "123456789",
  "rgOrgaoEmissor": "SSP",
  "rgUf": "SP",
  "rgDataEmissao": "2015-03-20",
  "dataNascimento": "1990-05-17",
  "sexo": "MASCULINO",
  "estadoCivil": "CASADO",
  "nacionalidade": "Brasileira",
  "naturalidade": "Campinas",
  "naturalidadeUf": "SP",
  "nomeMae": "Maria da Silva",
  "nomePai": "José da Silva",
  "pisPasep": "12345678919",
  "ctpsNumero": "1234567",
  "ctpsSerie": "0012",
  "ctpsUf": "SP",
  "tituloEleitor": "123456789012",

  "emailPessoal": "joao@gmail.com",
  "telefone": "1933334444",
  "celular": "19999998888",
  "contatoEmergenciaNome": "Ana Souza",
  "contatoEmergenciaParentesco": "Esposa",
  "contatoEmergenciaTelefone": "19988887777",

  "cep": "13015000",
  "logradouro": "Rua Barão de Jaguara",
  "numero": "100",
  "complemento": "Apto 12",
  "bairro": "Centro",
  "cidade": "Campinas",
  "uf": "SP",

  "matricula": "0042",
  "cargo": "Mecânico",
  "cbo": "914405",
  "dataAdmissao": "2024-02-01",
  "tipoContrato": "INDETERMINADO",
  "dataFimContrato": null,
  "jornadaSemanalHoras": 44,
  "salario": 2800.00,
  "dataDemissao": null
}
```

| Campo | Tipo | Observação |
|---|---|---|
| `sexo` | enum | `MASCULINO`, `FEMININO`, `OUTRO`, `NAO_INFORMADO` |
| `estadoCivil` | enum | `SOLTEIRO`, `CASADO`, `UNIAO_ESTAVEL`, `SEPARADO`, `DIVORCIADO`, `VIUVO` |
| `tipoContrato` | enum | `INDETERMINADO`, `EXPERIENCIA`, `DETERMINADO`, `APRENDIZ` |
| `dataFimContrato` | date | só faz sentido para `EXPERIENCIA`/`DETERMINADO`/`APRENDIZ` |
| `cbo` | string(6) | Classificação Brasileira de Ocupações |
| `salario` | number | BigDecimal, 2 casas (R$ mensais) |
| `cpf`, `pisPasep` | string(11) | só dígitos |
| `tituloEleitor` | string(12) | só dígitos |
| `uf`, `rgUf`, `ctpsUf`, `naturalidadeUf` | string(2) | sigla |

## Privacidade (LGPD) — importante

CPF, RG, PIS, CTPS, título, endereço e **salário** são dado pessoal (alguns sensíveis em contexto
trabalhista). Pedido:

1. `GET /api/v1/usuarios` (lista) devolve **só o resumo atual** (`id`, `nome`, `email`, `ativo`,
   `perfilId`, `perfilNome`) — sem os campos novos. A lista é usada por perfis com `USUARIO_READ`
   e hoje alimenta seletores.
2. `GET /api/v1/usuarios/{id}` devolve o cadastro completo, e os campos de RH só para quem tem
   `USUARIO_WRITE` (o front só os mostra nesse caso). Para um usuário ver o **próprio** cadastro
   basta o `id` coincidir com o do token.
3. Não logar esses campos; considerar criptografia em repouso para `cpf`, `rg`, `pisPasep`,
   `ctps*`, `tituloEleitor` e `salario`.
4. Auditar alterações em `salario`, `cargo`, `dataAdmissao`, `dataDemissao` (quem/quando).

## Critério de aceite

- `POST`/`PUT` com os campos acima persistem e voltam no `GET /{id}`.
- Criar usuário só com `nome`, `email`, `perfilId`, `senha` continua funcionando.
- CPF inválido → 400; CPF duplicado na oficina → 409.
- A lista não expõe os campos de RH.

## Fora desta fase (fase 2)

Dependentes (nome, CPF, nascimento, parentesco, dedução IR/salário‑família), dados bancários/PIX,
CNH, certificado de reservista, PCD, ASO (exames admissional/periódico), vale‑transporte/refeição,
upload de documentos.
