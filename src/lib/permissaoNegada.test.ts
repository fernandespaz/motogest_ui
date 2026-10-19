import { beforeEach, describe, expect, it } from 'vitest';
import {
  MENSAGEM_SEM_PERMISSAO,
  PERMISSAO_ROTULOS,
  abrirPermissaoNegada,
  permissoesExigidas,
  rotuloDaPermissao,
  usePermissaoNegadaStore,
} from './permissaoNegada';
import { PERMISSOES_POR_ENDPOINT } from './permissoesPorEndpoint';
import { toast, useToastStore } from '@/store/toastStore';

describe('permissoesExigidas', () => {
  it('resolve a rota literal', () => {
    expect(permissoesExigidas('get', '/api/v1/caixa/movimentos/periodo')).toEqual(['FINANCEIRO_READ']);
  });

  it('resolve rotas com variável de caminho e ignora query string e barra final', () => {
    expect(permissoesExigidas('POST', '/api/v1/produtos/15/movimentacoes?x=1')).toEqual(['ESTOQUE_WRITE']);
    expect(permissoesExigidas('post', '/api/v1/contas-pagar/9/pagar/')).toEqual(['FINANCEIRO_WRITE']);
  });

  it('aceita URL absoluta', () => {
    expect(permissoesExigidas('get', 'http://localhost:8080/api/v1/produtos')).toEqual(['ESTOQUE_READ']);
  });

  it('devolve todas as permissões alternativas do endpoint', () => {
    expect(permissoesExigidas('POST', '/api/v1/caixa/movimentos')).toEqual([
      'FINANCEIRO_WRITE',
      'CAIXA_OPERAR',
      'CAIXA_GERENCIAR',
    ]);
  });

  it('prefere a rota literal à variável, como o Spring (/sessoes/aberta vs /sessoes/{id})', () => {
    expect(permissoesExigidas('GET', '/api/v1/caixa/sessoes/aberta')).toEqual(['CAIXA_OPERAR', 'CAIXA_GERENCIAR']);
  });

  it('devolve vazio para endpoint desconhecido ou método sem regra', () => {
    expect(permissoesExigidas('GET', '/api/v1/nao-existe')).toEqual([]);
    expect(permissoesExigidas('DELETE', '/api/v1/caixa/movimentos')).toEqual([]);
    expect(permissoesExigidas('GET', undefined)).toEqual([]);
  });
});

describe('tabela gerada', () => {
  it('só referencia permissões que têm rótulo em português', () => {
    const semRotulo = new Set<string>();
    for (const [, , codigos] of PERMISSOES_POR_ENDPOINT) {
      for (const c of codigos) if (!(c in PERMISSAO_ROTULOS)) semRotulo.add(c);
    }
    expect([...semRotulo]).toEqual([]);
  });

  it('usa o próprio código quando não há rótulo', () => {
    expect(rotuloDaPermissao('FINANCEIRO_READ')).toBe('Visualizar contas e caixa');
    expect(rotuloDaPermissao('NOVA_PERMISSAO')).toBe('NOVA_PERMISSAO');
  });
});

describe('estado do diálogo e do toast', () => {
  beforeEach(() => {
    usePermissaoNegadaStore.getState().fechar();
    useToastStore.setState({ toasts: [] });
  });

  it('abre com a permissão descoberta a partir do endpoint', () => {
    abrirPermissaoNegada('post', '/api/v1/produtos/3/movimentacoes');

    expect(usePermissaoNegadaStore.getState().negada?.codigos).toEqual(['ESTOQUE_WRITE']);
  });

  it('suprime o toast genérico de 403 enquanto o diálogo está aberto, mas não outros toasts', () => {
    abrirPermissaoNegada('get', '/api/v1/caixa/movimentos/periodo');

    toast.error(MENSAGEM_SEM_PERMISSAO);
    toast.error('Outro erro');

    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['Outro erro']);
  });

  it('mostra o toast de 403 quando não há diálogo aberto (ex.: leitura fora do react-query)', () => {
    toast.error(MENSAGEM_SEM_PERMISSAO);

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});
