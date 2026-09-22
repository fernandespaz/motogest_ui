import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mesReferenciaAtual } from '@/lib/formatters';
import { useMesReferencia } from './useMesReferencia';

function em(url: string) {
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
}

describe('useMesReferencia', () => {
  it('reads a valid ?mes', () => {
    const { result } = renderHook(() => useMesReferencia(), { wrapper: em('/x?mes=2026-03') });
    expect(result.current[0]).toBe('2026-03');
  });

  it.each(['/x', '/x?mes=2026-13', '/x?mes=abc'])('falls back to the current month for %s', (url) => {
    const { result } = renderHook(() => useMesReferencia(), { wrapper: em(url) });
    expect(result.current[0]).toBe(mesReferenciaAtual());
  });

  it('writes the new month back to the URL', () => {
    const { result } = renderHook(() => useMesReferencia(), { wrapper: em('/x?mes=2026-03') });
    act(() => result.current[1]('2026-02'));
    expect(result.current[0]).toBe('2026-02');
  });
});
