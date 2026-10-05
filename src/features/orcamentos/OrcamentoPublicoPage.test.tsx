import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAprovarOrcamentoPublico, useOrcamentoPublico, useRejeitarOrcamentoPublico } from '@/hooks/useOrcamentoPublico';
import { OrcamentoPublicoPage } from './OrcamentoPublicoPage';

vi.mock('@/hooks/useOrcamentoPublico', () => ({
  useOrcamentoPublico: vi.fn(),
  useAprovarOrcamentoPublico: vi.fn(),
  useRejeitarOrcamentoPublico: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function renderPage(orcamento: Record<string, unknown>) {
  vi.mocked(useOrcamentoPublico).mockReturnValue({ data: orcamento, isLoading: false, isError: false } as never);
  vi.mocked(useAprovarOrcamentoPublico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  vi.mocked(useRejeitarOrcamentoPublico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  return render(
    <MemoryRouter initialEntries={['/orcamentos/publico/abc']}>
      <Routes>
        <Route path="/orcamentos/publico/:token" element={<OrcamentoPublicoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const base = { id: 12, status: 'ENVIADO', clienteNome: 'Carlos', veiculoPlaca: 'MTG0001', valorTotal: 100, itens: [] };

describe('OrcamentoPublicoPage — avarias da entrada', () => {
  it('mostra ao cliente as avarias registradas, com região e tipo em português', () => {
    renderPage({
      ...base,
      avarias: [
        { zona: 'PARA_CHOQUE_DIANTEIRO', tipo: 'ARRANHAO', descricao: 'risco no canto esquerdo' },
        { zona: 'TETO', tipo: 'AMASSADO' },
      ],
    });
    expect(screen.getByText('Avarias registradas na entrada')).toBeInTheDocument();
    expect(screen.getByText('Para-choque dianteiro')).toBeInTheDocument();
    expect(screen.getByText('risco no canto esquerdo')).toBeInTheDocument();
    expect(screen.getByText('Teto')).toBeInTheDocument();
  });

  it('não desenha a seção quando nada foi registrado', () => {
    renderPage({ ...base, avarias: [] });
    expect(screen.queryByText('Avarias registradas na entrada')).not.toBeInTheDocument();
  });
});
