import { describe, expect, it } from 'vitest';
import type { OrdemServicoResponse } from '@/api/types';
import { resumirFunilOs } from './useDashboardAdmin';

const os = (status: string) => ({ status }) as OrdemServicoResponse;

describe('resumirFunilOs', () => {
  it('groups live OS by stage and ignores delivered and cancelled ones', () => {
    const funil = resumirFunilOs([
      os('ABERTA'),
      os('AGUARDANDO_APROVACAO'),
      os('APROVADA'),
      os('EM_ANDAMENTO'),
      os('PAUSADA'),
      os('AGUARDANDO_PECA'),
      os('CONCLUIDA'),
      os('FATURADO'),
      os('ENTREGUE'),
      os('CANCELADA'),
    ]);
    expect(funil).toEqual({ abertas: 2, emExecucao: 4, paraFaturar: 1, paraEntregar: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(resumirFunilOs([])).toEqual({ abertas: 0, emExecucao: 0, paraFaturar: 0, paraEntregar: 0 });
  });
});
