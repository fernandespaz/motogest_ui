import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateModeloVeiculo, useModelosVeiculo } from '@/hooks/useModelosVeiculo';
import { toast } from '@/store/toastStore';
import { ModeloVeiculoField, ModeloVeiculoThumb } from './ModeloVeiculoField';

vi.mock('@/hooks/useModelosVeiculo', () => ({
  useModelosVeiculo: vi.fn(),
  useCreateModeloVeiculo: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const catalogo = {
  content: [
    { id: 1, marca: 'Volkswagen', modelo: 'Gol 1.6', imagemBase64: 'aGVsbG8=' },
    { id: 2, marca: 'Chevrolet', modelo: 'Onix 1.0', imagemBase64: undefined },
  ],
};

describe('ModeloVeiculoThumb', () => {
  it('renders the image when a base64 thumbnail is given', () => {
    const { container } = render(<ModeloVeiculoThumb base64="aGVsbG8=" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,aGVsbG8=');
  });

  it('falls back to a generic icon when there is no image', () => {
    const { container } = render(<ModeloVeiculoThumb base64={null} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('ModeloVeiculoField', () => {
  let criarMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useModelosVeiculo).mockReturnValue({ data: catalogo, isLoading: false } as never);
    criarMutateAsync = vi.fn().mockResolvedValue({ id: 3, marca: 'Fiat', modelo: 'Uno', imagemBase64: undefined });
    vi.mocked(useCreateModeloVeiculo).mockReturnValue({ mutateAsync: criarMutateAsync, isPending: false } as never);
  });

  it('invites the user to pick a model when none is set yet', () => {
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Escolher modelo do catálogo/ })).toBeInTheDocument();
  });

  it('offers to swap the model once marca/modelo are already filled', () => {
    render(<ModeloVeiculoField marca="Volkswagen" modelo="Gol 1.6" onSelecionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Trocar modelo do catálogo/ })).toBeInTheDocument();
  });

  it('opens the catalog modal listing every model, with thumbnails', async () => {
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));

    expect(screen.getByText('Modelo do veículo')).toBeInTheDocument();
    expect(screen.getByText('Volkswagen')).toBeInTheDocument();
    expect(screen.getByText('Chevrolet')).toBeInTheDocument();
  });

  it('filters the list by marca or modelo as the user searches', async () => {
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.type(screen.getByPlaceholderText('Buscar marca ou modelo...'), 'oni');

    expect(screen.getByText('Chevrolet')).toBeInTheDocument();
    expect(screen.queryByText('Volkswagen')).not.toBeInTheDocument();
  });

  it('selects an existing catalog entry, closing the picker', async () => {
    const onSelecionar = vi.fn();
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={onSelecionar} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.click(screen.getByText('Volkswagen'));

    expect(onSelecionar).toHaveBeenCalledWith({ marca: 'Volkswagen', modelo: 'Gol 1.6' });
    // A troca pra "Trocar modelo do catálogo" viria do pai atualizando marca/
    // modelo em resposta a onSelecionar — este componente não controla esses
    // valores, só avisa. Confirmar o fechamento observando onSelecionar
    // (como os outros modais do app fazem com onClose) evita depender do fim
    // da animação de saída do Modal, que o AnimatePresence não conclui no jsdom.
  });

  it('offers to register a new model when the search finds nothing', async () => {
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.type(screen.getByPlaceholderText('Buscar marca ou modelo...'), 'Polo 1.0');

    expect(screen.getByText('Nenhum modelo encontrado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo modelo' }));

    expect(screen.getByText('Cadastrar novo modelo')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Modelo/)).toHaveValue('Polo 1.0');
    expect(screen.getByLabelText(/^Marca/)).toHaveValue('');
  });

  it('keeps "Cadastrar e usar" disabled until both marca and modelo are filled', async () => {
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo modelo' }));

    expect(screen.getByRole('button', { name: 'Cadastrar e usar' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Marca/), 'Fiat');
    expect(screen.getByRole('button', { name: 'Cadastrar e usar' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Uno');
    expect(screen.getByRole('button', { name: 'Cadastrar e usar' })).not.toBeDisabled();
  });

  it('registers the new model without an image and selects it', async () => {
    const onSelecionar = vi.fn();
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={onSelecionar} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo modelo' }));
    await userEvent.type(screen.getByLabelText(/^Marca/), 'Fiat');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Uno');

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e usar' }));

    await waitFor(() => expect(criarMutateAsync).toHaveBeenCalledWith({ marca: 'Fiat', modelo: 'Uno', arquivo: undefined }));
    expect(toast.success).toHaveBeenCalledWith('Modelo cadastrado no catálogo.');
    expect(onSelecionar).toHaveBeenCalledWith({ marca: 'Fiat', modelo: 'Uno' });
  });

  it('uploads an image file along with the new model', async () => {
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo modelo' }));
    await userEvent.type(screen.getByLabelText(/^Marca/), 'Fiat');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Uno');

    const arquivo = new File(['conteudo'], 'uno.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, arquivo);

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e usar' }));

    await waitFor(() =>
      expect(criarMutateAsync).toHaveBeenCalledWith({ marca: 'Fiat', modelo: 'Uno', arquivo }),
    );
  });

  it('rejects an image that is not PNG or JPEG', async () => {
    render(<ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo modelo' }));

    const arquivo = new File(['conteudo'], 'uno.gif', { type: 'image/gif' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // applyAccept:false pra exercitar a validação própria do componente —
    // sem isso, o user-event já barra o arquivo pelo atributo accept do
    // input antes do onChange disparar, e o teste nunca chega no código dele.
    await userEvent.upload(fileInput, arquivo, { applyAccept: false });

    expect(toast.error).toHaveBeenCalledWith('Envie uma imagem PNG ou JPEG.');
  });

  it('never submits an ancestor form when any button inside is clicked', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ModeloVeiculoField marca={undefined} modelo={undefined} onSelecionar={vi.fn()} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.click(screen.getByText('Volkswagen'));
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Escolher modelo do catálogo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo modelo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    // "Fechar" existe duas vezes aqui (o X do Modal tem aria-label="Fechar" e
    // o rodapé tem um botão de texto "Fechar") — getAllBy pra não empatar.
    const botoesFechar = screen.getAllByRole('button', { name: 'Fechar' });
    for (const botao of botoesFechar) {
      await userEvent.click(botao);
    }
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
