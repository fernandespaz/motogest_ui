import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { produtosApi } from './produtos';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('produtosApi', () => {
  it('inherits the base CRUD methods for /produtos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await produtosApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos', { params: undefined });
  });

  it('abaixoDoMinimo() GETs produtos below their minimum stock', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, nome: 'Óleo Motor' }] });

    const result = await produtosApi.abaixoDoMinimo();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos/abaixo-do-minimo', { params: undefined });
    expect(result).toEqual([{ id: 1, nome: 'Óleo Motor' }]);
  });

  it('abaixoDoMinimo() forwards a categoria filter', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await produtosApi.abaixoDoMinimo({ categoria: 'FREIOS' });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos/abaixo-do-minimo', { params: { categoria: 'FREIOS' } });
  });

  it('enviarImagem() PUTs multipart form data (campo arquivo) with the Content-Type left for the browser to set', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { imagemUrl: '/x' } });
    const arquivo = new File(['fake'], 'foto.png', { type: 'image/png' });

    const result = await produtosApi.enviarImagem(7, arquivo);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/produtos/7/imagem', expect.any(FormData), {
      headers: { 'Content-Type': undefined },
    });
    const formData = vi.mocked(apiClient.put).mock.calls[0][1] as FormData;
    expect(formData.get('arquivo')).toBe(arquivo);
    expect(result).toEqual({ imagemUrl: '/x' });
  });

  it('removerImagem() DELETEs the produto photo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });
    await produtosApi.removerImagem(7);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/produtos/7/imagem');
  });

  it('buscarImagemBlob() GETs the photo as a blob', async () => {
    const blob = new Blob(['img']);
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: blob });
    const result = await produtosApi.buscarImagemBlob(7);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos/7/imagem', { responseType: 'blob' });
    expect(result).toBe(blob);
  });
});
