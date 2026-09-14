import { describe, expect, it } from 'vitest';
import * as endpoints from './index';

describe('endpoints barrel', () => {
  it('re-exports every resource api object', () => {
    expect(endpoints.authApi).toBeDefined();
    expect(endpoints.clientesApi).toBeDefined();
    expect(endpoints.veiculosApi).toBeDefined();
    expect(endpoints.agendaApi).toBeDefined();
    expect(endpoints.orcamentosApi).toBeDefined();
    expect(endpoints.ordensServicoApi).toBeDefined();
    expect(endpoints.produtosApi).toBeDefined();
    expect(endpoints.estoqueApi).toBeDefined();
    expect(endpoints.servicosApi).toBeDefined();
    expect(endpoints.caixaApi).toBeDefined();
    expect(endpoints.contasPagarApi).toBeDefined();
    expect(endpoints.contasReceberApi).toBeDefined();
    expect(endpoints.checklistsApi).toBeDefined();
    expect(endpoints.fotosApi).toBeDefined();
    expect(endpoints.perfisApi).toBeDefined();
    expect(endpoints.usuariosApi).toBeDefined();
    expect(endpoints.oficinasApi).toBeDefined();
    expect(endpoints.licencaApi).toBeDefined();
    expect(endpoints.dashboardApi).toBeDefined();
  });
});
