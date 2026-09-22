import { useMemo } from 'react';
import { clientesApi } from '@/api/endpoints/clientes';
import type { ClienteRequest, ClienteResponse, PageParams } from '@/api/types';
import { createCrudHooks } from './factory';

type ListParams = PageParams & { nome?: string; busca?: string };

const hooks = createCrudHooks<ClienteResponse, ClienteRequest, ListParams>('clientes', clientesApi);

export const clientesKeys = hooks.keys;
export const useClientes = hooks.useList;
export const useCliente = hooks.useDetail;
export const useCreateCliente = hooks.useCreate;
export const useUpdateCliente = hooks.useUpdate;
export const useDeleteCliente = hooks.useRemove;

/**
 * Vehicles now come embedded in ClienteResponse.veiculos (the standalone
 * GET /veiculos list lost its clienteId filter) — this is the single place
 * that reads them, so every "pick a vehicle for this client" UI stays in
 * sync with however the embedding ends up shaped.
 */
export function useVeiculosDoCliente(clienteId: number | undefined) {
  const query = useCliente(clienteId);
  return { ...query, data: query.data?.veiculos ?? [] };
}

/** "abc-1d23" → "ABC1D23" — placa comparada sem hífen/espaço e sem caixa. */
export function normalizarPlaca(placa: string | undefined | null): string {
  return (placa ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Trecho da placa (já normalizada) que casa com ou sem hífen no LIKE do
 * backend: placa brasileira tem 3 letras antes do hífen, então um termo que
 * começa com 3 letras vai só com elas; qualquer outro termo (ex.: "1D23", o
 * pedaço depois do hífen) vai inteiro.
 */
export function termoBackendPlaca(alvo: string): string {
  return /^[A-Z]{3}./.test(alvo) ? alvo.slice(0, 3) : alvo;
}

/**
 * Busca de veículo por placa. GET /veiculos não tem filtro nenhum, mas a
 * `busca` de GET /clientes já casa placa de qualquer veículo vinculado — então
 * a busca vai por lá e o resultado é achatado pros veículos cuja placa contém
 * o termo (o cliente pode ter casado pelo nome/documento e ter outras placas).
 * Depende de CLIENTE_READ; sem ela a consulta fica desligada.
 *
 * O backend compara a placa como foi gravada (LIKE simples, e o cadastro não
 * tem máscara — "ABC-1D23" e "ABC1D23" coexistem). Por isso o termo enviado é
 * só um trecho que nunca atravessa o hífen (ver termoBackendPlaca) e o casamento
 * exato, sem hífen, é feito aqui em cima do resultado.
 */
export function useBuscaVeiculosPorPlaca(termo: string, options?: { enabled?: boolean }) {
  const alvo = normalizarPlaca(termo);
  const query = useClientes(
    { busca: termoBackendPlaca(alvo), size: 50 },
    { enabled: !!alvo && (options?.enabled ?? true) },
  );
  const data = useMemo(
    () =>
      (query.data?.content ?? []).flatMap((cliente) =>
        (cliente.veiculos ?? [])
          .filter((v) => normalizarPlaca(v.placa).includes(alvo))
          .map((v) => ({ ...v, clienteId: v.clienteId ?? cliente.id, clienteNome: v.clienteNome ?? cliente.nome })),
      ),
    [query.data, alvo],
  );
  return { ...query, data };
}
