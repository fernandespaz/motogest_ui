import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { carregarImagem, exportarRecorte } from '@/lib/imagem';
import { ProdutoImagemField } from './ProdutoImagemField';

vi.mock('@/hooks/useProdutos', () => ({ useProdutoImagemBlob: vi.fn(() => ({ data: undefined })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// jsdom não tem canvas nem createImageBitmap — a matemática do recorte é do lib, aqui só o fluxo da tela.
vi.mock('@/lib/imagem', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/imagem')>()),
  carregarImagem: vi.fn(),
  exportarRecorte: vi.fn(),
  desenharEnquadramento: vi.fn(),
}));

function Harness({ onArquivo }: { onArquivo: (f: File | null) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  return (
    <ProdutoImagemField
      arquivo={arquivo}
      remover={false}
      onArquivoChange={(f) => {
        setArquivo(f);
        onArquivo(f);
      }}
      onRemoverChange={vi.fn()}
    />
  );
}

describe('ProdutoImagemField — recorte', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
  });

  const escolher = () =>
    userEvent.upload(screen.getByTestId('produto-imagem-input'), new File(['x'], 'correia.png', { type: 'image/png' }));

  it('opens the crop editor after choosing a photo and only commits the file on "Aplicar recorte"', async () => {
    vi.mocked(carregarImagem).mockResolvedValue({ width: 400, height: 400 } as ImageBitmap);
    const recortado = new File(['jpg'], 'correia.jpg', { type: 'image/jpeg' });
    vi.mocked(exportarRecorte).mockResolvedValue(recortado);
    const onArquivo = vi.fn();
    render(<Harness onArquivo={onArquivo} />);

    await escolher();
    expect(await screen.findByTestId('produto-imagem-recorte')).toBeInTheDocument();
    expect(onArquivo).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Aplicar recorte' }));

    await waitFor(() => expect(onArquivo).toHaveBeenCalledWith(recortado));
    expect(screen.queryByTestId('produto-imagem-recorte')).not.toBeInTheDocument();
  });

  it('discards the crop on Cancelar without selecting any file', async () => {
    vi.mocked(carregarImagem).mockResolvedValue({ width: 400, height: 400 } as ImageBitmap);
    const onArquivo = vi.fn();
    render(<Harness onArquivo={onArquivo} />);

    await escolher();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByTestId('produto-imagem-recorte')).not.toBeInTheDocument();
    expect(onArquivo).not.toHaveBeenCalled();
  });

  it('falls back to the original file when the browser cannot decode the image', async () => {
    vi.mocked(carregarImagem).mockResolvedValue(null);
    const onArquivo = vi.fn();
    render(<Harness onArquivo={onArquivo} />);

    await escolher();

    await waitFor(() => expect(onArquivo).toHaveBeenCalledWith(expect.objectContaining({ name: 'correia.png' })));
    expect(screen.queryByTestId('produto-imagem-recorte')).not.toBeInTheDocument();
  });
});
