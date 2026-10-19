import { create } from 'zustand';
import { PERMISSOES_POR_ENDPOINT } from './permissoesPorEndpoint';

/** Texto padrão do 403 — o toast com esta mensagem é suprimido enquanto o diálogo de permissão está aberto (ele diz o mesmo, com detalhe). */
export const MENSAGEM_SEM_PERMISSAO = 'Você não tem permissão para executar esta ação.';

/** Rótulos em português dos códigos de permissão (o backend só devolve a descrição sem acento, e só a quem tem PERFIL_READ). */
export const PERMISSAO_ROTULOS: Record<string, string> = {
  OFICINA_READ: 'Visualizar dados da oficina',
  OFICINA_WRITE: 'Editar dados da oficina',
  USUARIO_READ: 'Visualizar usuários',
  USUARIO_WRITE: 'Cadastrar e editar usuários',
  PERFIL_READ: 'Visualizar perfis de acesso',
  PERFIL_WRITE: 'Cadastrar e editar perfis de acesso',
  CLIENTE_READ: 'Visualizar clientes',
  CLIENTE_WRITE: 'Cadastrar e editar clientes',
  VEICULO_READ: 'Visualizar veículos',
  VEICULO_WRITE: 'Cadastrar e editar veículos',
  VEICULO_MODELO_READ: 'Visualizar marcas e modelos de veículo',
  VEICULO_MODELO_WRITE: 'Cadastrar e editar marcas e modelos de veículo',
  AGENDA_READ: 'Visualizar a agenda',
  AGENDA_WRITE: 'Cadastrar e editar agendamentos',
  SERVICO_READ: 'Visualizar o catálogo de serviços',
  SERVICO_WRITE: 'Cadastrar e editar o catálogo de serviços',
  ORCAMENTO_READ: 'Visualizar orçamentos',
  ORCAMENTO_WRITE: 'Cadastrar e editar orçamentos',
  ORDEM_SERVICO_READ: 'Visualizar ordens de serviço',
  ORDEM_SERVICO_WRITE: 'Cadastrar e editar ordens de serviço',
  CHECKLIST_WRITE: 'Registrar checklists de entrada e saída',
  FOTO_WRITE: 'Anexar fotos às ordens de serviço',
  ESTOQUE_READ: 'Visualizar produtos e estoque',
  ESTOQUE_WRITE: 'Cadastrar produtos e movimentar o estoque',
  ESTOQUE_RESERVAR: 'Reservar e liberar estoque em orçamentos e OS',
  FINANCEIRO_READ: 'Visualizar contas e caixa',
  FINANCEIRO_WRITE: 'Cadastrar e editar contas e lançamentos',
  FINANCEIRO_FECHAR: 'Fechar e reabrir períodos do financeiro',
  CAIXA_OPERAR: 'Operar o caixa (abrir, fechar e lançar)',
  CAIXA_GERENCIAR: 'Gerenciar o caixa (todas as sessões e relatórios)',
  HORA_TECNICA_GERENCIAR: 'Gerenciar a hora técnica',
  CAPACIDADE_PRODUTIVA_GERENCIAR: 'Gerenciar a capacidade produtiva',
  PRODUTIVIDADE_READ: 'Visualizar a produtividade',
  DESCONTO_APROVAR: 'Aprovar ou rejeitar descontos',
  DASHBOARD_READ: 'Visualizar o dashboard',
  FISCAL_CONFIGURAR: 'Configurar os dados fiscais',
  FISCAL_EMITIR: 'Emitir e consultar NFS-e',
  FISCAL_CANCELAR: 'Cancelar NFS-e',
  FISCAL_CERTIFICADO: 'Gerenciar o certificado digital',
};

export const rotuloDaPermissao = (codigo: string) => PERMISSAO_ROTULOS[codigo] ?? codigo;

function casaComTemplate(template: string, caminho: string): boolean {
  const t = template.split('/');
  const c = caminho.split('/');
  return t.length === c.length && t.every((seg, i) => (seg.startsWith('{') ? c[i].length > 0 : seg === c[i]));
}

/** Mais segmentos literais vence, como faz o Spring (`/aberta` ganha de `/{id}`). */
const literais = (template: string) => template.split('/').filter((s) => !s.startsWith('{')).length;

/** Permissões que liberam `método + url` (basta uma), ou `[]` se o endpoint não é conhecido ou não é protegido por permissão. */
export function permissoesExigidas(metodo: string | undefined, url: string | undefined): readonly string[] {
  if (!url) return [];
  const caminho = url
    .split('?')[0]
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\/+$/, '');
  const m = (metodo ?? 'get').toUpperCase();
  const candidatos = PERMISSOES_POR_ENDPOINT.filter(([mt, tpl]) => mt === m && casaComTemplate(tpl, caminho));
  if (candidatos.length === 0) return [];
  candidatos.sort((a, b) => literais(b[1]) - literais(a[1]));
  return candidatos[0][2];
}

export interface PermissaoNegada {
  /** Permissões que liberariam a ação (basta uma). Vazio = não foi possível descobrir qual. */
  codigos: readonly string[];
  metodo?: string;
  url?: string;
}

interface PermissaoNegadaState {
  negada: PermissaoNegada | null;
  abrir: (info: PermissaoNegada) => void;
  fechar: () => void;
}

export const usePermissaoNegadaStore = create<PermissaoNegadaState>((set) => ({
  negada: null,
  abrir: (negada) => set({ negada }),
  fechar: () => set({ negada: null }),
}));

export function abrirPermissaoNegada(metodo: string | undefined, url: string | undefined) {
  usePermissaoNegadaStore.getState().abrir({ codigos: permissoesExigidas(metodo, url), metodo, url });
}
