import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfiguracaoFiscal, useEmitirNfse } from '@/hooks/useFiscal';
import { OfertaEmissaoNfse } from './OfertaEmissaoNfse';

vi.mock('@/hooks/useFiscal', () => ({
  useConfiguracaoFiscal: vi.fn(),
  useEmitirNfse: vi.fn(),
}));

describe('OfertaEmissaoNfse', () => {
  const emitir = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEmitirNfse).mockReturnValue({
      mutateAsync: emitir,
      isPending: false,
      isSuccess: false,
      isError: false,
    } as never);
  });

  function renderOferta() {
    return render(<OfertaEmissaoNfse ordemServico={{ id: 345, numero: 'OS-0345' }} onClose={onClose} />);
  }

  it('offers to emit right after faturar, and only emits when the user confirms', async () => {
    vi.mocked(useConfiguracaoFiscal).mockReturnValue({
      data: { prontaParaEmitir: true, ambiente: 'HOMOLOGACAO' },
      isError: false,
    } as never);
    emitir.mockResolvedValueOnce({ id: 1, status: 'AUTORIZADA', numero: '55' });
    renderOferta();

    expect(screen.getByText('OS faturada. Emitir NFS-e agora?')).toBeInTheDocument();
    expect(emitir).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Emitir agora' }));
    await waitFor(() => expect(emitir).toHaveBeenCalledWith(345));
    expect(await screen.findByRole('alertdialog', { name: 'NFS-e autorizada' })).toBeInTheDocument();
  });

  it('"Depois" dismisses the offer without emitting', async () => {
    vi.mocked(useConfiguracaoFiscal).mockReturnValue({ data: { prontaParaEmitir: true }, isError: false } as never);
    renderOferta();

    await userEvent.click(screen.getByRole('button', { name: 'Depois' }));
    expect(onClose).toHaveBeenCalled();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('stays silent and closes itself when the oficina is not ready to emit', async () => {
    vi.mocked(useConfiguracaoFiscal).mockReturnValue({ data: { prontaParaEmitir: false }, isError: false } as never);
    renderOferta();

    expect(screen.queryByText('OS faturada. Emitir NFS-e agora?')).not.toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows the backend reason in an error dialog when the emission is refused', async () => {
    vi.mocked(useConfiguracaoFiscal).mockReturnValue({ data: { prontaParaEmitir: true }, isError: false } as never);
    emitir.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: 'Ja existe uma NFS-e emitida ou em emissao' } },
    });
    renderOferta();

    await userEvent.click(screen.getByRole('button', { name: 'Emitir agora' }));
    expect(await screen.findByRole('alertdialog', { name: 'Não foi possível emitir a NFS-e' })).toBeInTheDocument();
  });
});
