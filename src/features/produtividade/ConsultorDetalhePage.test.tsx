import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProdutividadeConsultor } from '@/hooks/useProdutividade';
import { useAuthStore } from '@/store/authStore';
import { ConsultorDetalhePage } from './ConsultorDetalhePage';

vi.mock('@/hooks/useProdutividade', () => ({ useProdutividadeConsultor: vi.fn() }));

const detalhe = {
  mes: '2026-09',
  usuarioId: 1,
  usuarioNome: 'Ana Souza',
  indicadores: { orcamentosEmitidos: 1, orcamentosAprovados: 1, taxaConversaoPercentual: 100 },
  orcamentosEmitidos: [
    { id: 42, clienteNome: 'João', status: 'APROVADO', valorTotal: 500, tempoRespostaMinutos: 135 },
  ],
  servicosFechados: [{ id: 9, numero: 'OS-0009', clienteNome: 'Maria', valorTotal: 800, clienteRecorrente: true }],
};

function renderPage(url = '/produtividade/consultores/1?mes=2026-09') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/produtividade/consultores/:usuarioId" element={<ConsultorDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConsultorDetalhePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissoes: ['PRODUTIVIDADE_READ', 'ORCAMENTO_READ', 'ORDEM_SERVICO_READ'],
      perfil: 'Administrador',
      usuarioId: 99,
    });
    vi.mocked(useProdutividadeConsultor).mockReturnValue({ data: detalhe, isLoading: false } as never);
  });

  it('shows the consultor, the quotes issued with response time, and the closed services', async () => {
    renderPage();
    expect(useProdutividadeConsultor).toHaveBeenCalledWith(1, '2026-09');
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('2h 15min')).toBeInTheDocument();
    expect(screen.getByText('Aprovado')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Serviços fechados \(1\)/ }));
    expect(screen.getByText('OS-0009')).toBeInTheDocument();
    expect(screen.getByText('Recorrente')).toBeInTheDocument();
  });

  it('links to the quote only for profiles that can open it', () => {
    renderPage();
    expect(screen.getByRole('link', { name: '#42' })).toHaveAttribute('href', '/orcamentos/42');

    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ'] });
    renderPage();
    expect(screen.getAllByText('#42').at(-1)?.closest('a')).toBeNull();
  });

  it('shows "not found" for a malformed id instead of spinning forever', () => {
    vi.mocked(useProdutividadeConsultor).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage('/produtividade/consultores/abc');
    expect(screen.getByText('Consultor não encontrado')).toBeInTheDocument();
  });

  it('keeps a Consultor on their own numbers: never queries a colleague and hides the back-to-ranking button', () => {
    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ'], perfil: 'Consultor Técnico', usuarioId: 1 });
    renderPage('/produtividade/consultores/2?mes=2026-09');
    expect(useProdutividadeConsultor).not.toHaveBeenCalledWith(2, expect.anything());
    expect(useProdutividadeConsultor).toHaveBeenLastCalledWith(1, '2026-09');
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voltar/ })).not.toBeInTheDocument();
  });
});
