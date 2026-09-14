import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from './toastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('push() adds a toast, defaulting to the info variant', () => {
    useToastStore.getState().push('Salvo com sucesso');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ message: 'Salvo com sucesso', variant: 'info' });
    expect(toasts[0].id).toBeTruthy();
  });

  it('push() accepts an explicit variant', () => {
    useToastStore.getState().push('Falha ao salvar', 'error');
    expect(useToastStore.getState().toasts[0].variant).toBe('error');
  });

  it('auto-dismisses a toast after 4.5s', () => {
    useToastStore.getState().push('Salvo com sucesso');
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(4500);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismiss() removes only the matching toast', () => {
    useToastStore.getState().push('Primeiro');
    useToastStore.getState().push('Segundo');
    const [first, second] = useToastStore.getState().toasts;

    useToastStore.getState().dismiss(first.id);

    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
  });
});

describe('toast convenience helpers', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('success() pushes a success-variant toast', () => {
    toast.success('Cliente criado');
    expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Cliente criado', variant: 'success' });
  });

  it('error() pushes an error-variant toast', () => {
    toast.error('Falha ao criar cliente');
    expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Falha ao criar cliente', variant: 'error' });
  });

  it('info() pushes an info-variant toast', () => {
    toast.info('Sincronizando...');
    expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Sincronizando...', variant: 'info' });
  });
});
