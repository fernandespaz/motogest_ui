import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarEnderecoPorCep } from './cep';

describe('buscarEnderecoPorCep', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null without calling the network for an incomplete CEP', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await buscarEnderecoPorCep('0131');

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a found ViaCEP response to the app shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            cep: '01310-100',
            logradouro: 'Avenida Paulista',
            bairro: 'Bela Vista',
            localidade: 'São Paulo',
            uf: 'SP',
          }),
      }),
    );

    const result = await buscarEnderecoPorCep('01310100');

    expect(result).toEqual({
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
    });
  });

  it('returns null when ViaCEP reports the CEP does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ erro: true }) }),
    );

    expect(await buscarEnderecoPorCep('00000000')).toBeNull();
  });

  it('returns null instead of throwing on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    expect(await buscarEnderecoPorCep('01310100')).toBeNull();
  });

  it('returns null on a non-OK HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    expect(await buscarEnderecoPorCep('01310100')).toBeNull();
  });
});
