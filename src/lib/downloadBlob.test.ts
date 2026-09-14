import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openPdfInNewTab } from './downloadBlob';

describe('openPdfInNewTab', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('navigates the pre-opened tab to the blob URL when the popup is allowed', async () => {
    const fakeWin = { location: { href: '' }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(fakeWin);
    const blob = new Blob(['pdf']);

    await openPdfInNewTab(() => Promise.resolve(blob), 'relatorio.pdf');

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(fakeWin.location.href).toBe('blob:mock-url');
  });

  it('revokes the object URL after the delay', async () => {
    vi.spyOn(window, 'open').mockReturnValue({ location: { href: '' }, close: vi.fn() } as unknown as Window);

    await openPdfInNewTab(() => Promise.resolve(new Blob(['pdf'])), 'relatorio.pdf');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('falls back to a downloading anchor click when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const clickSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    await openPdfInNewTab(() => Promise.resolve(new Blob(['pdf'])), 'relatorio.pdf');

    expect(anchor.download).toBe('relatorio.pdf');
    expect(anchor.href).toBe('blob:mock-url');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('closes the pre-opened tab and rethrows when fetching the blob fails', async () => {
    const fakeWin = { location: { href: '' }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(fakeWin);
    const error = new Error('network down');

    await expect(openPdfInNewTab(() => Promise.reject(error), 'relatorio.pdf')).rejects.toThrow('network down');
    expect(fakeWin.close).toHaveBeenCalled();
  });
});
