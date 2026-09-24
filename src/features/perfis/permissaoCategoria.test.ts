import { describe, expect, it } from 'vitest';
import { agruparPermissoesPorCategoria, categoriaDaPermissao } from './permissaoCategoria';

describe('categoriaDaPermissao', () => {
  it('categorizes management-facing resources as Gerencial', () => {
    expect(categoriaDaPermissao('OFICINA_READ')).toBe('GERENCIAL');
    expect(categoriaDaPermissao('USUARIO_WRITE')).toBe('GERENCIAL');
    expect(categoriaDaPermissao('PERFIL_READ')).toBe('GERENCIAL');
    expect(categoriaDaPermissao('FINANCEIRO_READ')).toBe('GERENCIAL');
    expect(categoriaDaPermissao('HORA_TECNICA_GERENCIAR')).toBe('GERENCIAL');
    expect(categoriaDaPermissao('DESCONTO_APROVAR')).toBe('GERENCIAL');
  });

  it('categorizes customer-facing resources as Comercial', () => {
    expect(categoriaDaPermissao('CLIENTE_READ')).toBe('COMERCIAL');
    expect(categoriaDaPermissao('VEICULO_WRITE')).toBe('COMERCIAL');
    expect(categoriaDaPermissao('AGENDA_READ')).toBe('COMERCIAL');
    expect(categoriaDaPermissao('ORCAMENTO_WRITE')).toBe('COMERCIAL');
  });

  it('categorizes shop-floor execution resources as Técnico', () => {
    expect(categoriaDaPermissao('ORDEM_SERVICO_WRITE')).toBe('TECNICO');
    expect(categoriaDaPermissao('CHECKLIST_WRITE')).toBe('TECNICO');
    expect(categoriaDaPermissao('FOTO_WRITE')).toBe('TECNICO');
    expect(categoriaDaPermissao('ESTOQUE_READ')).toBe('TECNICO');
  });

  it('falls back to Outros for an unmapped code instead of throwing or dropping it', () => {
    expect(categoriaDaPermissao('RECURSO_NOVO_READ')).toBe('OUTROS');
    expect(categoriaDaPermissao('ALGO_SEM_SUFIXO')).toBe('OUTROS');
  });

  // Guarda contra o gap real encontrado na revisão: ESTOQUE_RESERVAR caía em
  // "Outros" porque SUFIXOS_ACAO não reconhecia "_RESERVAR", mesmo sendo um
  // recurso (ESTOQUE) já mapeado — todo código de permissão hoje usado em
  // algum hasPermission() do app (grep por `_READ|_WRITE|_GERENCIAR|_APROVAR|
  // _RESERVAR` em src/) precisa cair numa categoria real, não em "Outros".
  it('resolves every permission code actually referenced in the app today to a real category, not Outros', () => {
    const codigosConhecidos = [
      'OFICINA_READ',
      'OFICINA_WRITE',
      'USUARIO_READ',
      'USUARIO_WRITE',
      'PERFIL_READ',
      'CLIENTE_READ',
      'CLIENTE_WRITE',
      'VEICULO_READ',
      'VEICULO_WRITE',
      'AGENDA_READ',
      'AGENDA_WRITE',
      'SERVICO_READ',
      'ORCAMENTO_READ',
      'ORCAMENTO_WRITE',
      'ORDEM_SERVICO_READ',
      'ORDEM_SERVICO_WRITE',
      'CHECKLIST_WRITE',
      'FOTO_WRITE',
      'ESTOQUE_READ',
      'ESTOQUE_WRITE',
      'ESTOQUE_RESERVAR',
      'FINANCEIRO_READ',
      'HORA_TECNICA_GERENCIAR',
      'PRODUTIVIDADE_READ',
      'DESCONTO_APROVAR',
      'DASHBOARD_READ',
    ];
    for (const codigo of codigosConhecidos) {
      expect(categoriaDaPermissao(codigo), codigo).not.toBe('OUTROS');
    }
  });
});

describe('agruparPermissoesPorCategoria', () => {
  it('groups permissions by category while preserving each group\'s original order', () => {
    const permissoes = [
      { id: 1, codigo: 'CLIENTE_READ' },
      { id: 2, codigo: 'USUARIO_READ' },
      { id: 3, codigo: 'CLIENTE_WRITE' },
    ];
    const grupos = agruparPermissoesPorCategoria(permissoes);
    expect(grupos.get('COMERCIAL')).toEqual([permissoes[0], permissoes[2]]);
    expect(grupos.get('GERENCIAL')).toEqual([permissoes[1]]);
  });

  it('skips entries without a codigo instead of crashing', () => {
    const grupos = agruparPermissoesPorCategoria([{ id: 1, codigo: undefined }, { id: 2, codigo: 'CLIENTE_READ' }]);
    expect(grupos.get('COMERCIAL')).toHaveLength(1);
  });
});
