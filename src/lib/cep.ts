import { onlyDigits } from './formatters';

export interface EnderecoPorCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/**
 * ViaCEP — API pública e gratuita, sem chave, mantida pra consulta de CEP no
 * Brasil. Sem SLA formal; falhas de rede ou CEP inexistente resolvem para
 * `null` em vez de lançar, já que isso nunca deve travar o cadastro do cliente.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      uf: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
