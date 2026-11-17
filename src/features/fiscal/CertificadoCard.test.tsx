import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCertificadoFiscal, useEnviarCertificadoFiscal, useRemoverCertificadoFiscal } from '@/hooks/useFiscal';
import { CertificadoCard } from './CertificadoCard';

vi.mock('@/hooks/useFiscal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useFiscal')>();
  return {
    ...actual,
    useCertificadoFiscal: vi.fn(),
    useEnviarCertificadoFiscal: vi.fn(),
    useRemoverCertificadoFiscal: vi.fn(),
  };
});

describe('CertificadoCard — escolha do arquivo', () => {
  const enviar = vi.fn();

  beforeEach(() => {
    enviar.mockReset().mockResolvedValue({ enviado: true });
    vi.mocked(useCertificadoFiscal).mockReturnValue({ data: { enviado: false }, isLoading: false } as never);
    vi.mocked(useEnviarCertificadoFiscal).mockReturnValue({ mutateAsync: enviar, isPending: false } as never);
    vi.mocked(useRemoverCertificadoFiscal).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('usa o botão do sistema (input nativo escondido) e começa sem arquivo', () => {
    render(<CertificadoCard podeEditar mostrar={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Escolher arquivo/ })).toBeInTheDocument();
    expect(screen.getByText('Nenhum arquivo escolhido')).toBeInTheDocument();
    expect(screen.getByTestId('certificado-arquivo-input')).toHaveClass('hidden');
    expect(screen.getByRole('button', { name: /Enviar certificado/ })).toBeDisabled();
  });

  it('o botão abre o seletor de arquivo e mostra o nome escolhido', async () => {
    render(<CertificadoCard podeEditar mostrar={vi.fn()} />);
    const input = screen.getByTestId('certificado-arquivo-input') as HTMLInputElement;
    const abrir = vi.spyOn(input, 'click');

    await userEvent.click(screen.getByRole('button', { name: /Escolher arquivo/ }));
    expect(abrir).toHaveBeenCalled();

    await userEvent.upload(input, new File(['x'], 'oficina-a1.pfx'));
    expect(screen.getByText('oficina-a1.pfx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trocar arquivo/ })).toBeInTheDocument();
  });

  it('envia o arquivo escolhido com a senha', async () => {
    render(<CertificadoCard podeEditar mostrar={vi.fn()} />);
    const arquivo = new File(['x'], 'oficina-a1.pfx');

    await userEvent.upload(screen.getByTestId('certificado-arquivo-input'), arquivo);
    await userEvent.type(screen.getByLabelText(/Senha do certificado/), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /Enviar certificado/ }));

    await waitFor(() => expect(enviar).toHaveBeenCalledWith({ arquivo, senha: 'segredo' }));
  });
});
