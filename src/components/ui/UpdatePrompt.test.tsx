import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatePrompt } from './UpdatePrompt';

const updateServiceWorker = vi.fn();
let precisaAtualizar = false;
let onRegisteredSW: ((url: string, reg?: unknown) => void) | undefined;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (opts: { onRegisteredSW: typeof onRegisteredSW }) => {
    onRegisteredSW = opts.onRegisteredSW;
    return { needRefresh: [precisaAtualizar, vi.fn()], updateServiceWorker };
  },
}));

describe('UpdatePrompt', () => {
  beforeEach(() => {
    precisaAtualizar = false;
    updateServiceWorker.mockClear();
  });

  it('não mostra nada quando não há versão nova', () => {
    render(<UpdatePrompt />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra o aviso e atualiza ao clicar em "Atualizar"', async () => {
    precisaAtualizar = true;
    render(<UpdatePrompt />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nova versão disponível');
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('checa versão nova periodicamente', () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    render(<UpdatePrompt />);
    onRegisteredSW?.('/sw.js', { update });
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
