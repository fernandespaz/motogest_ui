/**
 * Preço do item livre: valor da peça + um percentual de acréscimo (valor × (1 + %/100)). É o que o
 * consultor pensa ("paguei 150, ponho 25%") e o resultado é o preço final que o cliente vê. O backend
 * recebe só o valor da peça e o preço final já calculado — nunca o percentual.
 */

/** Preço final a partir do valor da peça e do acréscimo. undefined quando não dá pra calcular. */
export function precoComAcrescimo(valorBase: number, acrescimoPercentual: number): number | undefined {
  if (!Number.isFinite(valorBase) || !Number.isFinite(acrescimoPercentual)) return undefined;
  if (valorBase < 0 || acrescimoPercentual < 0) return undefined;
  return Math.round(valorBase * (1 + acrescimoPercentual / 100) * 100) / 100;
}

/** Acréscimo vigente sobre o valor da peça (o que o preço final representa). undefined sem base. */
export function acrescimoSobreBase(valorBase: number, preco: number): number | undefined {
  if (!Number.isFinite(valorBase) || !Number.isFinite(preco) || valorBase <= 0 || preco < 0) return undefined;
  return Math.round((preco / valorBase - 1) * 10000) / 100;
}

/** Margem de lucro sobre o preço de venda — só pra mostrar o lucro agregado ao consultor. */
export function margemSobrePreco(custo: number, preco: number): number | undefined {
  if (!Number.isFinite(custo) || !Number.isFinite(preco) || preco <= 0) return undefined;
  return Math.round((1 - custo / preco) * 10000) / 100;
}

export function lucroDoItem(custo: number, preco: number, quantidade: number): number {
  return Math.round((preco - custo) * quantidade * 100) / 100;
}
