import { afterEach, describe, expect, it, vi } from 'vitest';
import { webhookPagBankLiberado } from './liberacaoPagamentos';

describe('webhookPagBankLiberado', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('fica bloqueada por padrão (sem a variável)', () => {
    vi.stubEnv('VITE_PAGBANK_WEBHOOK_LIBERADO', '');
    expect(webhookPagBankLiberado()).toBe(false);
  });

  it('só libera com "true" exato', () => {
    vi.stubEnv('VITE_PAGBANK_WEBHOOK_LIBERADO', 'sim');
    expect(webhookPagBankLiberado()).toBe(false);
    vi.stubEnv('VITE_PAGBANK_WEBHOOK_LIBERADO', 'true');
    expect(webhookPagBankLiberado()).toBe(true);
  });
});
