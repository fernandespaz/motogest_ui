import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOficinaAtual, useOficinaLogoSrc } from '@/hooks/useOficina';
import { Topbar } from './Topbar';

vi.mock('@/hooks/useOficina', () => ({
  useOficinaAtual: vi.fn(),
  useOficinaLogoSrc: vi.fn(),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Topbar />
    </MemoryRouter>,
  );
}

describe('Topbar', () => {
  beforeEach(() => {
    vi.mocked(useOficinaLogoSrc).mockReturnValue(undefined);
  });

  it('shows the oficina’s nomeFantasia when available', () => {
    vi.mocked(useOficinaAtual).mockReturnValue({ data: { nomeFantasia: 'Ram Tec' } } as never);
    renderAt('/');

    expect(screen.getByText('Ram Tec')).toBeInTheDocument();
  });

  it('falls back to "MotoGest" when the oficina has no nomeFantasia yet', () => {
    vi.mocked(useOficinaAtual).mockReturnValue({ data: undefined } as never);
    renderAt('/');

    expect(screen.getByText('MotoGest')).toBeInTheDocument();
  });

  it('shows the current section as group / title, including on sub-routes', () => {
    vi.mocked(useOficinaAtual).mockReturnValue({ data: { nomeFantasia: 'Ram Tec' } } as never);
    renderAt('/clientes/12');

    const crumb = screen.getByRole('navigation', { name: 'Seção atual' });
    expect(crumb).toHaveTextContent('Operação');
    expect(crumb).toHaveTextContent('Clientes');
  });
});
