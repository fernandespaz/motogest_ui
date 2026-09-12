import { describe, expect, it } from 'vitest';
import { API_ROUTES } from './routes';

describe('API_ROUTES', () => {
  it('builds parameterized paths with the given id', () => {
    expect(API_ROUTES.agenda.status(42)).toBe('/api/v1/agendamentos/42/status');
    expect(API_ROUTES.orcamentos.enviar(7)).toBe('/api/v1/orcamentos/7/enviar');
    expect(API_ROUTES.ordensServico.aPartirDeOrcamento(3)).toBe('/api/v1/ordens-servico/a-partir-de-orcamento/3');
    expect(API_ROUTES.contasPagar.pagar(1)).toBe('/api/v1/contas-pagar/1/pagar');
    expect(API_ROUTES.checklists.base(9)).toBe('/api/v1/ordens-servico/9/checklists');
    expect(API_ROUTES.fotos.remover(5)).toBe('/api/v1/fotos/5');
  });

  it('exposes static base paths matching the backend contract prefix', () => {
    expect(API_ROUTES.clientes.base).toBe('/api/v1/clientes');
    expect(API_ROUTES.veiculos.base).toBe('/api/v1/veiculos');
    expect(API_ROUTES.auth.login).toBe('/api/v1/auth/login');
    expect(API_ROUTES.dashboard.base).toBe('/api/v1/dashboard');
  });
});
