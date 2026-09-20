// Carrega o SDK oficial do PagBank no navegador e criptografa os dados do
// cartão *no cliente*, usando a chave pública (VITE_PAGBANK_PUBLIC_KEY — não é
// segredo, é seguro embutir no bundle). O número do cartão, validade e CVV
// nunca saem do navegador em texto puro: só o resultado criptografado
// (`cardToken`) é enviado ao nosso backend, que repassa ao PagBank junto com o
// token secreto (esse sim, exclusivo do backend). Ver api/endpoints/pagamentos.ts.
//
// ATENÇÃO: o nome global (`window.PagSeguro`) e o método `encryptCard` foram
// confirmados contra a documentação pública do PagBank no momento da
// implementação, não contra uma chamada real ao SDK carregado — confirme isso
// em uma primeira execução manual (console do navegador) antes de liberar em
// produção, e ajuste aqui se o contrato real do SDK divergir.

const SDK_URL = 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js';

interface PagBankEncryptCardInput {
  publicKey: string;
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
}

interface PagBankEncryptCardError {
  code: string;
  message: string;
}

interface PagBankEncryptCardResult {
  encryptedCard?: string;
  hasErrors: boolean;
  errors?: PagBankEncryptCardError[];
}

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard: (input: PagBankEncryptCardInput) => PagBankEncryptCardResult;
    };
  }
}

let sdkPromise: Promise<void> | null = null;

export function carregarPagBankSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SDK de pagamento indisponível neste ambiente.'));
  if (window.PagSeguro) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existente) {
      existente.addEventListener('load', () => resolve());
      existente.addEventListener('error', () => reject(new Error('Não foi possível carregar o SDK de pagamento.')));
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Não foi possível carregar o SDK de pagamento. Verifique sua conexão e tente novamente.'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

const ERRO_CARTAO_MENSAGENS: Record<string, string> = {
  INVALID_NUMBER: 'Número do cartão inválido.',
  INVALID_HOLDER: 'Nome do titular inválido.',
  INVALID_EXPIRATION_MONTH: 'Mês de validade inválido.',
  INVALID_EXPIRATION_YEAR: 'Ano de validade inválido.',
  INVALID_SECURITY_CODE: 'Código de segurança (CVV) inválido.',
};

export interface DadosCartao {
  numero: string;
  nomeTitular: string;
  validadeMes: string;
  validadeAno: string;
  cvv: string;
}

/**
 * Criptografa o cartão inteiramente no navegador via SDK do PagBank e devolve
 * o token opaco a ser enviado como `cardToken`. Lança erro com mensagem em
 * português pronta para exibir ao usuário — nunca repassa código de erro cru
 * do gateway (ver prohibited-actions/coding-standards deste projeto).
 */
export function criptografarCartao(dados: DadosCartao): string {
  const publicKey = import.meta.env.VITE_PAGBANK_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('Pagamento por cartão ainda não configurado (chave pública do PagBank ausente).');
  }
  if (!window.PagSeguro) {
    throw new Error('SDK de pagamento ainda não carregado. Tente novamente em instantes.');
  }

  const resultado = window.PagSeguro.encryptCard({
    publicKey,
    holder: dados.nomeTitular,
    number: dados.numero,
    expMonth: dados.validadeMes,
    expYear: dados.validadeAno,
    securityCode: dados.cvv,
  });

  if (resultado.hasErrors || !resultado.encryptedCard) {
    const codigo = resultado.errors?.[0]?.code;
    const mensagem = codigo ? ERRO_CARTAO_MENSAGENS[codigo] : undefined;
    throw new Error(mensagem ?? 'Não foi possível validar os dados do cartão. Confira os campos e tente novamente.');
  }

  return resultado.encryptedCard;
}
