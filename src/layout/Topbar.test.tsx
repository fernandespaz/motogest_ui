import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useOficinaAtual, useOficinaLogoSrc } from '@/hooks/useOficina';
import { Topbar } from './Topbar';

vi.mock('@/hooks/useOficina', () => ({
  useOficinaAtual: vi.fn(),
  useOficinaLogoSrc: vi.fn(),
}));

describe('Topbar', () => {
  beforeEach(() => {
    vi.mocked(useOficinaLogoSrc).mockReturnValue(undefined);
  });

  it('shows the oficina’s nomeFantasia when available', () => {
    vi.mocked(useOficinaAtual).mockReturnValue({ data: { nomeFantasia: 'Ram Tec' } } as never);
    useAuthStore.setState({ nome: 'Diego Fernandes' });
    render(<Topbar />);

    expect(screen.getByText('Ram Tec')).toBeInTheDocument();
    expect(screen.getByText('Olá, Diego')).toBeInTheDocument();
  });

  it('falls back to "MotoGest" when the oficina has no nomeFantasia yet', () => {
    vi.mocked(useOficinaAtual).mockReturnValue({ data: undefined } as never);
    useAuthStore.setState({ nome: 'Diego Fernandes' });
    render(<Topbar />);

    expect(screen.getByText('MotoGest')).toBeInTheDocument();
  });
});
