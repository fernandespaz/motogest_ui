import { afterEach, describe, expect, it, vi } from 'vitest';
import { criptografarCartao } from './pagbankSdk';

const dadosCartao = {
  numero: '4111111111111111',
  nomeTitular: 'Ana Souza',
  validadeMes: '12',
  validadeAno: '2028',
  cvv: '123',
};

describe('criptografarCartao', () => {
  afterEach(() => {
    delete (window as { PagSeguro?: unknown }).PagSeguro;
  });

  it('throws a clear error when the public key is empty/not yet loaded', () => {
    window.PagSeguro = { encryptCard: vi.fn() };

    expect(() => criptografarCartao('', dadosCartao)).toThrow(/temporariamente indisponível/);
  });

  it('throws a clear error when the SDK has not loaded yet', () => {
    expect(() => criptografarCartao('chave-publica-fake', dadosCartao)).toThrow(/SDK de pagamento ainda não carregado/);
  });

  it('returns the encrypted card token on success, without ever exposing the raw card data', () => {
    const encryptCard = vi.fn().mockReturnValue({ hasErrors: false, encryptedCard: 'enc_abc123' });
    window.PagSeguro = { encryptCard };

    const token = criptografarCartao('chave-publica-fake', dadosCartao);

    expect(token).toBe('enc_abc123');
    expect(encryptCard).toHaveBeenCalledWith({
      publicKey: 'chave-publica-fake',
      holder: dadosCartao.nomeTitular,
      number: dadosCartao.numero,
      expMonth: dadosCartao.validadeMes,
      expYear: dadosCartao.validadeAno,
      securityCode: dadosCartao.cvv,
    });
  });

  it('translates a known PagBank error code into a Portuguese message', () => {
    window.PagSeguro = {
      encryptCard: vi.fn().mockReturnValue({ hasErrors: true, errors: [{ code: 'INVALID_SECURITY_CODE', message: 'x' }] }),
    };

    expect(() => criptografarCartao('chave-publica-fake', dadosCartao)).toThrow('Código de segurança (CVV) inválido.');
  });

  it('falls back to a generic message for an unknown/absent error code', () => {
    window.PagSeguro = { encryptCard: vi.fn().mockReturnValue({ hasErrors: true, errors: [] }) };

    expect(() => criptografarCartao('chave-publica-fake', dadosCartao)).toThrow(/Não foi possível validar os dados do cartão/);
  });
});
