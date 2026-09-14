import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { oficinasApi } from '@/api/endpoints/oficinas';
import type { OficinaResponse } from '@/api/types';
import { carregarLogoParaPdf } from './logo';

vi.mock('@/api/endpoints/oficinas', () => ({
  oficinasApi: { buscarLogoBlob: vi.fn() },
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
