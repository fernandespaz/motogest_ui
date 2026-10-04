import { useEffect } from 'react';
import { alertaDeErro } from './fiscalAlertas';
import type { Alerta } from './useAlerta';

/**
 * As queries fiscais são `silentError` (sem toast global), então toda tela que
 * as usa precisa transformar a falha em diálogo — senão o erro some sem aviso.
 */
export function useErroComoAlerta(
  isError: boolean,
  error: unknown,
  titulo: string,
  mostrar: (alerta: Alerta) => void,
) {
  useEffect(() => {
    if (isError) mostrar(alertaDeErro(error, titulo, 'Tente novamente em instantes.'));
  }, [isError, error, titulo, mostrar]);
}
