import { useSearchParams } from 'react-router-dom';
import { mesReferenciaAtual } from '@/lib/formatters';

const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Mês de referência dos relatórios guardado em `?mes=yyyy-MM` — sobrevive ao
 * "voltar" do detalhe de um consultor pra lista e dá pra compartilhar o link.
 * Valor ausente ou malformado cai no mês corrente.
 */
export function useMesReferencia(): [string, (mes: string) => void] {
  const [params, setParams] = useSearchParams();
  const bruto = params.get('mes');
  const mes = bruto && FORMATO_MES.test(bruto) ? bruto : mesReferenciaAtual();

  function setMes(novo: string) {
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual);
        proximo.set('mes', novo);
        return proximo;
      },
      { replace: true },
    );
  }

  return [mes, setMes];
}
