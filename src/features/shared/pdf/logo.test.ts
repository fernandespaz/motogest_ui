import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { oficinasApi } from '@/api/endpoints/oficinas';
import { getLogoFixadaParaLogin, getNomeFixadoParaLogin } from '@/hooks/useOficina';
import type { OficinaResponse } from '@/api/types';
import { carregarLogoParaPdf, resolverOficinaParaPdf } from './logo';

vi.mock('@/api/endpoints/oficinas', () => ({
  oficinasApi: { buscarLogoBlob: vi.fn(), atual: vi.fn() },
}));

vi.mock('@/hooks/useOficina', () => ({
  getLogoFixadaParaLogin: vi.fn(),
  getNomeFixadoParaLogin: vi.fn(),
}));

function stubImageBitmap(width: number, height: number) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width, height } as ImageBitmap),
  );
}

function stubCanvas(dataUrl = 'data:image/png;base64,fake') {
  const ctx = { drawImage: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(dataUrl);
  return ctx;
}

function oficina(overrides: Partial<OficinaResponse> = {}): OficinaResponse {
  return { id: 1, ...overrides } as OficinaResponse;
}

describe('carregarLogoParaPdf', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns null without any network call when there is no logo at all', async () => {
    const result = await carregarLogoParaPdf(oficina());
    expect(result).toBeNull();
    expect(oficinasApi.buscarLogoBlob).not.toHaveBeenCalled();
  });

  it('builds a scaled-down data URL from the uploaded logo image', async () => {
    vi.mocked(oficinasApi.buscarLogoBlob).mockResolvedValueOnce(new Blob(['fake']));
    stubImageBitmap(800, 400);
    stubCanvas('data:image/png;base64,uploaded');

    const result = await carregarLogoParaPdf(oficina({ logoImagemDisponivel: true }));

    // 800x400 scaled so the longer side (800) caps at 400 → scale 0.5
    expect(result).toEqual({ dataUrl: 'data:image/png;base64,uploaded', largura: 400, altura: 200 });
  });

  it('never upscales an image already smaller than the 400px cap', async () => {
    vi.mocked(oficinasApi.buscarLogoBlob).mockResolvedValueOnce(new Blob(['fake']));
    stubImageBitmap(100, 50);
    stubCanvas();

    const result = await carregarLogoParaPdf(oficina({ logoImagemDisponivel: true }));

    expect(result).toEqual({ dataUrl: 'data:image/png;base64,fake', largura: 100, altura: 50 });
  });

  it('falls back to fetching logoUrl when there is no uploaded image', async () => {
    stubImageBitmap(200, 200);
    stubCanvas();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['fake'])) }),
    );

    const result = await carregarLogoParaPdf(oficina({ logoUrl: 'https://cdn.example.com/logo.png' }));

    expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/logo.png');
    expect(result).not.toBeNull();
  });

  it('returns null when fetching logoUrl fails with a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await carregarLogoParaPdf(oficina({ logoUrl: 'https://cdn.example.com/logo.png' }));

    expect(result).toBeNull();
  });

  it('returns null when the canvas 2D context is unavailable', async () => {
    vi.mocked(oficinasApi.buscarLogoBlob).mockResolvedValueOnce(new Blob(['fake']));
    stubImageBitmap(200, 200);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    const result = await carregarLogoParaPdf(oficina({ logoImagemDisponivel: true }));

    expect(result).toBeNull();
  });

  it('swallows any unexpected failure and returns null instead of throwing', async () => {
    vi.mocked(oficinasApi.buscarLogoBlob).mockRejectedValueOnce(new Error('network down'));

    await expect(carregarLogoParaPdf(oficina({ logoImagemDisponivel: true }))).resolves.toBeNull();
  });
});

describe('resolverOficinaParaPdf', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the live oficina + logo when GET /oficinas/atual succeeds', async () => {
    vi.mocked(oficinasApi.atual).mockResolvedValueOnce(
      oficina({
        nomeFantasia: 'Oficina do Zé',
        razaoSocial: 'Zé Motos LTDA',
        cnpj: '11222333000181',
        logoImagemDisponivel: true,
      }),
    );
    vi.mocked(oficinasApi.buscarLogoBlob).mockResolvedValueOnce(new Blob(['fake']));
    stubImageBitmap(100, 50);
    stubCanvas('data:image/png;base64,live');

    const result = await resolverOficinaParaPdf();

    expect(result).toEqual({
      nomeFantasia: 'Oficina do Zé',
      razaoSocial: 'Zé Motos LTDA',
      cnpj: '11222333000181',
      endereco: '',
      contato: '',
      logo: { dataUrl: 'data:image/png;base64,live', largura: 100, altura: 50 },
    });
    expect(getNomeFixadoParaLogin).not.toHaveBeenCalled();
  });

  // Perfis sem OFICINA_READ (Consultor, Mecânico) recebem 403 aqui — é o caso
  // que motivou esse fallback: antes disso quebrava a geração do PDF inteira,
  // não só a logo.
  it('falls back to the browser-fixed nome/logo when GET /oficinas/atual is forbidden, without exposing CNPJ/razão social', async () => {
    vi.mocked(oficinasApi.atual).mockRejectedValueOnce(new Error('403'));
    vi.mocked(oficinasApi.buscarLogoBlob).mockRejectedValueOnce(new Error('404'));
    vi.mocked(getNomeFixadoParaLogin).mockReturnValueOnce('Oficina do Zé');
    vi.mocked(getLogoFixadaParaLogin).mockReturnValueOnce('data:image/png;base64,fixada');
    stubImageBitmap(100, 50);
    stubCanvas('data:image/png;base64,fixada-redimensionada');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['fake'])) }),
    );

    const result = await resolverOficinaParaPdf();

    expect(result).toEqual({
      nomeFantasia: 'Oficina do Zé',
      razaoSocial: '',
      cnpj: '',
      endereco: '',
      contato: '',
      logo: { dataUrl: 'data:image/png;base64,fixada-redimensionada', largura: 100, altura: 50 },
    });
  });

  it('falls back to "MotoGest" and no logo when there is neither a live oficina nor anything fixed in this browser', async () => {
    vi.mocked(oficinasApi.atual).mockRejectedValueOnce(new Error('403'));
    vi.mocked(oficinasApi.buscarLogoBlob).mockRejectedValueOnce(new Error('404'));
    vi.mocked(getNomeFixadoParaLogin).mockReturnValueOnce(null);
    vi.mocked(getLogoFixadaParaLogin).mockReturnValueOnce(null);

    const result = await resolverOficinaParaPdf();

    expect(result).toEqual({
      nomeFantasia: 'MotoGest',
      razaoSocial: '',
      cnpj: '',
      endereco: '',
      contato: '',
      logo: null,
    });
  });

  it('prints the full address and contact line in the letterhead for who can read them', async () => {
    vi.mocked(oficinasApi.atual).mockResolvedValueOnce(
      oficina({
        nomeFantasia: 'Oficina do Zé',
        logradouro: 'Rua das Flores',
        numero: '100',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01000000',
        telefone: '11999990000',
        email: 'contato@ze.com',
      }),
    );

    const result = await resolverOficinaParaPdf();

    expect(result.endereco).toBe('Rua das Flores, 100 · Centro · São Paulo/SP · CEP 01000-000');
    expect(result.contato).toBe('(11) 99999-0000 · contato@ze.com');
  });

  it('still gets the logo from the permission-free logo endpoint when GET /oficinas/atual fails', async () => {
    vi.mocked(oficinasApi.atual).mockRejectedValueOnce(new Error('403'));
    vi.mocked(oficinasApi.buscarLogoBlob).mockResolvedValueOnce(new Blob(['fake']));
    vi.mocked(getNomeFixadoParaLogin).mockReturnValueOnce('Oficina do Zé');
    stubImageBitmap(100, 50);
    stubCanvas('data:image/png;base64,endpoint');

    const result = await resolverOficinaParaPdf();

    expect(result.logo).toEqual({ dataUrl: 'data:image/png;base64,endpoint', largura: 100, altura: 50 });
    expect(getLogoFixadaParaLogin).not.toHaveBeenCalled();
  });
});
