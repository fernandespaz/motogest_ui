import { useState } from 'react';
import { buscarEnderecoPorCep } from '@/lib/cep';
import { onlyDigits } from '@/lib/formatters';

/**
 * Wraps the ViaCEP lookup with a loading flag — reusable by any form with a
 * CEP + address block (cliente, oficina, ...). Only fires once 8 digits are
 * present; anything else (still typing, invalid) resolves to null silently.
 */
export function useCepLookup() {
  const [buscando, setBuscando] = useState(false);

  async function buscar(cep: string) {
    if (onlyDigits(cep).length !== 8) return null;
    setBuscando(true);
    try {
      return await buscarEnderecoPorCep(cep);
    } finally {
      setBuscando(false);
    }
  }

  return { buscando, buscar };
}
