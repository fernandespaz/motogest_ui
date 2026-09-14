import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Editar cliente">
        Conteúdo
      </Modal>,
    );
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('renders the title, body and footer when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Editar cliente" footer={<button>Salvar</button>}>
        Conteúdo do formulário
      </Modal>,
    );
    expect(screen.getByText('Editar cliente')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do formulário')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('omits the header entirely when no title is given', () => {
    render(
      <Modal open onClose={vi.fn()}>
        Conteúdo
      </Modal>,
    );
    expect(screen.queryByLabelText('Fechar')).not.toBeInTheDocument();
  });

  it('calls onClose when the backdrop, the close button, or Escape is used', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Editar cliente">
        Conteúdo
      </Modal>,
    );

    await userEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it.each(['sm', 'md', 'lg', 'xl'] as const)('renders the %s size without crashing', (size) => {
    render(
      <Modal open onClose={vi.fn()} title="Título" size={size}>
        Conteúdo
      </Modal>,
    );
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });
});
