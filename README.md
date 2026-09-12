# MotoGest UI

Frontend web do **MotoGest**, um SaaS multi-tenant de gestão de oficinas mecânicas. Cada oficina (tenant) usa a mesma aplicação para gerenciar clientes, veículos, agenda, orçamentos, ordens de serviço, estoque e financeiro — o isolamento entre oficinas é garantido inteiramente pelo backend (JWT + validação por tenant).

## Stack

- **React 18** + **TypeScript** + **Vite**
- **TanStack Query** (react-query) — cache e sincronização com a API
- **React Hook Form** + **Zod** — formulários e validação
- **React Router** — rotas e guards de autenticação
- **Axios** — cliente HTTP com interceptors globais
- **Tailwind CSS** — estilização utilitária, com tokens de tema via CSS variables
- **Framer Motion** — transições de tela e microinterações
- **Zustand** — estado global leve (sessão de auth e toasts)

## Pré-requisitos

- Node.js 18+ (recomendado 20+)
- A API do MotoGest rodando localmente em `http://localhost:8080` (Swagger em `/swagger-ui/index.html`)

## Como rodar

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`. A URL base da API é configurada em `.env.development` (`VITE_API_BASE_URL`, padrão `http://localhost:8080`) — ajuste esse arquivo (ou crie um `.env.local`) se o backend estiver em outro endereço.

Outros scripts:

```bash
npm run build     # type-check (tsc -b) + build de produção em /dist
npm run preview   # serve o build de produção localmente
npm run lint      # eslint
npm run gen:api   # regenera src/api/schema.d.ts a partir de openapi.json
```

### Atualizando os tipos da API

O arquivo `openapi.json` na raiz é uma cópia do contrato exposto pelo backend em `/v3/api-docs`. Sempre que a API mudar (novo endpoint, novo campo), baixe o spec atualizado e regenere os tipos:

```bash
curl -s http://localhost:8080/v3/api-docs -o openapi.json
npm run gen:api
```

Isso regrava `src/api/schema.d.ts` — nenhum outro arquivo precisa ser editado manualmente por causa disso, já que os tipos usados no app (`src/api/types.ts`) são reexportados a partir dele.

## Arquitetura e organização de pastas

```
src/
├── api/            # Camada de acesso à API — nenhuma UI aqui
│   ├── client.ts       # instância Axios + interceptors (auth header, 401/403)
│   ├── crud.ts         # factory genérica de list/get/create/update/remove
│   ├── schema.d.ts     # GERADO — tipos a partir do openapi.json (não editar à mão)
│   ├── types.ts        # tipos "de fachada" reexportados do schema gerado
│   └── endpoints/      # um módulo por recurso (clientes.ts, agenda.ts, ...)
│
├── hooks/          # Hooks do TanStack Query — a ponte entre api/ e as telas
│   ├── factory.ts      # createCrudHooks: gera useList/useDetail/useCreate/... 
│   └── use<Recurso>.ts # um arquivo por recurso, usa a factory + extras
│
├── store/          # Estado global (Zustand)
│   ├── authStore.ts    # sessão do usuário logado, token, permissões
│   └── toastStore.ts   # notificações (toasts)
│
├── auth/           # Guards de rota
│   ├── RequireAuth.tsx       # bloqueia rotas sem sessão válida
│   └── RequirePermission.tsx # esconde/mostra UI por permissão do usuário
│
├── layout/         # Casca visual da aplicação autenticada
│   ├── AppShell.tsx    # grid geral: sidebar + topbar + conteúdo + nav mobile
│   ├── Sidebar.tsx     # navegação desktop, agrupada (Operação/Gestão/Administração)
│   ├── MobileNav.tsx   # bottom tab bar + menu "Mais" para telas pequenas
│   ├── Topbar.tsx      # cabeçalho com nome do usuário e logout
│   ├── TrialBanner.tsx # aviso de trial expirando
│   └── nav.ts          # fonte única da lista de itens de navegação
│
├── components/ui/  # Design system interno (Button, Input, Modal, DataTable, ...)
│                    # Componentes "burros": não sabem nada sobre domínio ou API
│
├── features/       # Uma pasta por módulo de negócio, contém páginas + modais
│   ├── auth/            # login e cadastro de oficina (rotas públicas)
│   ├── dashboard/
│   ├── clientes/
│   ├── veiculos/
│   ├── agenda/
│   ├── orcamentos/
│   ├── ordens-servico/  # inclui abas de Checklists e Fotos
│   ├── produtos/        # cadastro + movimentação de estoque
│   ├── servicos/        # catálogo de serviços
│   ├── financeiro/      # caixa, contas a pagar, contas a receber (abas)
│   ├── usuarios/
│   ├── perfis/          # perfis de acesso e catálogo de permissões
│   ├── oficina/         # dados cadastrais + licença/trial/upgrade
│   └── shared/          # componentes compartilhados entre features
│       └── ItemsEditor.tsx  # editor de itens (serviço/produto) usado em
│                            # orçamentos e ordens de serviço
│
├── routes/
│   └── router.tsx  # única fonte de verdade das rotas (createBrowserRouter)
│
└── lib/            # utilitários puros, sem estado
    ├── formatters.ts   # moeda, datas, máscaras de CPF/CNPJ/telefone
    ├── statusMeta.ts   # label + cor para os enums de status da API
    ├── downloadBlob.ts # abrir PDF (blob autenticado) em nova aba
    └── queryClient.ts  # instância única do QueryClient
```

### Fluxo de dados

```
Página (features/*)
   ↓ usa
Hook de dados (hooks/use<Recurso>.ts)
   ↓ usa
Módulo de API (api/endpoints/<recurso>.ts)
   ↓ usa
Axios client (api/client.ts) ──→ Backend MotoGest
```

- **`api/endpoints`** conhece apenas HTTP e os tipos gerados — não importa nada de React.
- **`hooks`** é a única camada que fala com o TanStack Query: cada hook expõe `useList`, `useDetail`, `useCreate`, `useUpdate`, `useRemove` (via `hooks/factory.ts`) mais ações específicas do recurso (ex.: `useEnviarOrcamento`, `useAtualizarStatusOS`).
- **`features`** só conhece hooks e componentes de `components/ui` — nunca chama `axios` ou `api/endpoints` diretamente.
- Toda mutação que muda dados relacionados invalida as query keys certas (ex.: pagar uma conta invalida a conta **e** o caixa, já que o backend gera um lançamento automático).

### Autenticação e sessão

- O login (`POST /auth/login`) exige `cnpj + email + senha` — não existe usuário "root" nem seletor de tenant: **um login = uma oficina**, o isolamento é feito pelo backend via JWT.
- `authStore` (Zustand + `persist`) guarda o token e os dados da sessão no `localStorage`. Em todo `login()`/`logout()`, o store **limpa completamente** o `localStorage` e o cache do TanStack Query (`queryClient.clear()`) antes de aplicar o novo estado — isso evita que dados de uma oficina vazem para a sessão de outra ao trocar de conta no mesmo navegador.
- `RequireAuth` protege as rotas autenticadas; `RequirePermission` (baseado nos códigos de permissão retornados no login) esconde ações que o perfil do usuário não tem — é só uma camada de UX, a autorização real é sempre revalidada pelo backend (respostas 403 caem no interceptor do Axios).

### Responsividade

- **Sidebar** (desktop, `lg:`+) com itens agrupados por “Operação”, “Gestão” e “Administração”.
- **Bottom tab bar** (mobile) com os 4 itens mais usados no dia a dia do operador (Dashboard, Agenda, Clientes, Ordens de Serviço) + um menu “Mais” para o resto.
- Formulários e tabelas usam grid responsivo do Tailwind (`sm:`/`md:`/`lg:`) e a `DataTable` genérica esconde colunas secundárias em telas pequenas (`hideBelow`).

### Sobre o backend

O contrato consumido é o exposto pelo Swagger do backend (`/v3/api-docs`). Duas particularidades importantes:

- Não existe endpoint de **usuário root** nem de listagem cross-tenant de oficinas — cadastro de oficina é público e self-service (`POST /oficinas/registrar`), e cada oficina só enxerga os próprios dados.
- Controle de trial/licença é auto-atendido pela própria oficina via `GET /licenca/atual` e `POST /licenca/upgrade` (este último é um stub, sem integração de pagamento real ainda).
