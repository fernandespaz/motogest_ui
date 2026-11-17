import type { ComissaoResponse } from '@/api/types';

export interface ComissoesDoFuncionario {
  usuarioId: number;
  usuarioNome: string;
  comissoes: ComissaoResponse[];
  /** Comissões já geradas (OS concluída/faturada) que ainda não foram pagas ao funcionário. */
  totalAPagar: number;
  totalPago: number;
  /** OS distintas: uma mesma OS pode render comissão de mecânico e de consultor para pessoas diferentes, mas não duas ao mesmo papel. */
  quantidadeOs: number;
}

export interface TotaisComissoes {
  aPagar: number;
  pago: number;
  total: number;
}

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

/** Agrupa as comissões do período por funcionário; quem tem mais a receber vem primeiro. */
export function agruparPorFuncionario(comissoes: ComissaoResponse[]): ComissoesDoFuncionario[] {
  const porUsuario = new Map<number, ComissaoResponse[]>();
  for (const c of comissoes) {
    const lista = porUsuario.get(c.usuarioId);
    if (lista) lista.push(c);
    else porUsuario.set(c.usuarioId, [c]);
  }
  return [...porUsuario.values()]
    .map((lista) => {
      const aPagar = lista.filter((c) => c.status === 'PENDENTE');
      const pagas = lista.filter((c) => c.status === 'PAGA');
      return {
        usuarioId: lista[0].usuarioId,
        usuarioNome: lista[0].usuarioNome,
        comissoes: [...lista].sort((a, b) => b.dataGeracao.localeCompare(a.dataGeracao)),
        totalAPagar: arredondar(aPagar.reduce((soma, c) => soma + c.valor, 0)),
        totalPago: arredondar(pagas.reduce((soma, c) => soma + c.valor, 0)),
        quantidadeOs: new Set(lista.map((c) => c.ordemServicoId)).size,
      };
    })
    .sort((a, b) => b.totalAPagar - a.totalAPagar || a.usuarioNome.localeCompare(b.usuarioNome));
}

export function totaisDoPeriodo(grupos: ComissoesDoFuncionario[]): TotaisComissoes {
  const aPagar = arredondar(grupos.reduce((soma, g) => soma + g.totalAPagar, 0));
  const pago = arredondar(grupos.reduce((soma, g) => soma + g.totalPago, 0));
  return { aPagar, pago, total: arredondar(aPagar + pago) };
}
