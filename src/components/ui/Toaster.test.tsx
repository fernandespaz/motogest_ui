import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useToastStore } from '@/store/toastStore';
import { Toaster } from './Toaster';

describe('Toaster', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<Toaster />);
    expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
  });

  it.each(['success', 'error', 'info'] as const)('renders a %s toast with its message', (variant) => {
    useToastStore.setState({ toasts: [{ id: '1', message: 'Cliente salvo', variant }] });
    render(<Toaster />);
    expect(screen.getByText('Cliente salvo')).toBeInTheDocument();
  });

  it('dismisses a toast when its close button is clicked', async () => {
    useToastStore.setState({ toasts: [{ id: '1', message: 'Cliente salvo', variant: 'success' }] });
    render(<Toaster />);

    await userEvent.click(screen.getByLabelText('Fechar'));

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
