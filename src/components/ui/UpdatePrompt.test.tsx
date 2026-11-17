import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('recarregamento depois de "Atualizar"', () => {
    const reload = vi.fn();

    beforeEach(() => {
      vi.useFakeTimers();
      reload.mockClear();
      vi.stubGlobal('location', { ...window.location, reload });
      precisaAtualizar = true;
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('recarrega mesmo quando o workbox não avisa que o SW novo assumiu (plano B de 2 s)', () => {
      render(<UpdatePrompt />);
      act(() => screen.getByRole('button', { name: 'Atualizar' }).click());
      expect(updateServiceWorker).toHaveBeenCalledWith(true);
      expect(reload).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('recarrega uma vez só quando o controllerchange chega antes do prazo', () => {
      const listeners: Array<() => void> = [];
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: { addEventListener: (_: string, fn: () => void) => listeners.push(fn) },
      });
      render(<UpdatePrompt />);
      act(() => screen.getByRole('button', { name: 'Atualizar' }).click());

      act(() => listeners[0]());
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(reload).toHaveBeenCalledTimes(1);
    });
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
