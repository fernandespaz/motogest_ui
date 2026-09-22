import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { oficinasApi } from '@/api/endpoints/oficinas';
import { licencaApi } from '@/api/endpoints/licenca';
import { useAuthStore } from '@/store/authStore';
import {
  useOficinaAtual,
  useAtualizarOficina,
  useOficinaLogoSrc,
  useEnviarLogoOficina,
  useRemoverLogoOficina,
  useLicencaAtual,
  getLogoFixadaParaLogin,
  getNomeFixadoParaLogin,
} from './useOficina';

vi.mock('@/api/endpoints/oficinas', () => ({
  oficinasApi: { atual: vi.fn(), atualizar: vi.fn(), enviarLogo: vi.fn(), removerLogo: vi.fn(), buscarLogoBlob: vi.fn() },
}));
vi.mock('@/api/endpoints/licenca', () => ({
  licencaApi: { atual: vi.fn() },
}));

describe('useOficina hooks', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['OFICINA_READ'] });
    localStorage.clear();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useOficinaAtual', () => {
    it('stays disabled for a profile without OFICINA_READ', () => {
      useAuthStore.setState({ permissoes: [] });
      const { result } = renderHook(() => useOficinaAtual(), { wrapper: wrapWithQueryClient() });
      expect(result.current.fetchStatus).toBe('idle');
      expect(oficinasApi.atual).not.toHaveBeenCalled();
    });

    it('fetches the oficina and pins its display name for the login screen', async () => {
      vi.mocked(oficinasApi.atual).mockResolvedValueOnce({ id: 1, nomeFantasia: 'Ram Tec' } as never);
      const { result } = renderHook(() => useOficinaAtual(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getNomeFixadoParaLogin()).toBe('Ram Tec');
    });

    it('falls back to razaoSocial when nomeFantasia is absent', async () => {
      vi.mocked(oficinasApi.atual).mockResolvedValueOnce({ id: 1, razaoSocial: 'Ram Tec LTDA' } as never);
      const { result } = renderHook(() => useOficinaAtual(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getNomeFixadoParaLogin()).toBe('Ram Tec LTDA');
    });
  });

  describe('useAtualizarOficina', () => {
    it('invalidates the oficina query on success', async () => {
      vi.mocked(oficinasApi.atualizar).mockResolvedValueOnce({ id: 1 } as never);
      const client = createTestQueryClient();
      const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useAtualizarOficina(), { wrapper: wrapWithQueryClient(client) });

      result.current.mutate({ razaoSocial: 'Ram Tec 2' } as never);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['oficina', 'atual'] });
    });
  });

  describe('useOficinaLogoSrc', () => {
    it('returns undefined while nothing is available yet', () => {
      vi.mocked(oficinasApi.atual).mockResolvedValueOnce({ id: 1 } as never);
      const { result } = renderHook(() => useOficinaLogoSrc(), { wrapper: wrapWithQueryClient() });
      expect(result.current).toBeUndefined();
    });

    it('fetches and returns a blob URL when the oficina has an uploaded logo image', async () => {
      vi.mocked(oficinasApi.atual).mockResolvedValueOnce({ id: 1, logoImagemDisponivel: true } as never);
      vi.mocked(oficinasApi.buscarLogoBlob).mockResolvedValueOnce(new Blob(['fake-image']));

      const { result } = renderHook(() => useOficinaLogoSrc(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current).toBe('blob:mock-url'));
      expect(oficinasApi.buscarLogoBlob).toHaveBeenCalled();
    });

    it('falls back to the plain logoUrl when there is no uploaded logo image', async () => {
      vi.mocked(oficinasApi.atual).mockResolvedValueOnce({
        id: 1,
        logoImagemDisponivel: false,
        logoUrl: 'https://cdn.example.com/logo.png',
      } as never);

      const { result } = renderHook(() => useOficinaLogoSrc(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current).toBe('https://cdn.example.com/logo.png'));
      expect(oficinasApi.buscarLogoBlob).not.toHaveBeenCalled();
    });

    it('falls back to the browser-pinned logo when nothing else is available', async () => {
      localStorage.setItem('motogest:login-logo', 'data:image/png;base64,pinned');
      vi.mocked(oficinasApi.atual).mockResolvedValueOnce({ id: 1, logoImagemDisponivel: false } as never);

      const { result } = renderHook(() => useOficinaLogoSrc(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current).toBe('data:image/png;base64,pinned'));
    });
  });

  describe('useEnviarLogoOficina', () => {
    it('invalidates the oficina and logo blob queries on success', async () => {
      vi.mocked(oficinasApi.enviarLogo).mockResolvedValueOnce({ id: 1 } as never);
      const client = createTestQueryClient();
      const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useEnviarLogoOficina(), { wrapper: wrapWithQueryClient(client) });

      result.current.mutate(new File(['fake'], 'logo.png'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['oficina', 'atual'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['oficina', 'logo-blob'] });
    });
  });

  describe('useRemoverLogoOficina', () => {
    it('invalidates the oficina query, clears the pinned login logo, and removes the blob query', async () => {
      localStorage.setItem('motogest:login-logo', 'data:image/png;base64,pinned');
      vi.mocked(oficinasApi.removerLogo).mockResolvedValueOnce({ id: 1 } as never);
      const client = createTestQueryClient();
      const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
      const removeSpy = vi.spyOn(client, 'removeQueries');
      const { result } = renderHook(() => useRemoverLogoOficina(), { wrapper: wrapWithQueryClient(client) });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['oficina', 'atual'] });
      expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['oficina', 'logo-blob'] });
      expect(getLogoFixadaParaLogin()).toBeNull();
    });
  });

  describe('licença hooks', () => {
    it('useLicencaAtual() fetches the current licença', async () => {
      vi.mocked(licencaApi.atual).mockResolvedValueOnce({ plano: 'BASICO' } as never);
      const { result } = renderHook(() => useLicencaAtual(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ plano: 'BASICO' });
    });
  });

  describe('login-pinned getters', () => {
    it('return null when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });

      expect(getLogoFixadaParaLogin()).toBeNull();
      expect(getNomeFixadoParaLogin()).toBeNull();
    });
  });
});
