import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agendaApi } from '@/api/endpoints/agenda';
import type { AgendamentoRequest, AgendamentoResponse, AgendamentoStatus, PageParams } from '@/api/types';
import { createCrudHooks } from './factory';

const hooks = createCrudHooks<AgendamentoResponse, AgendamentoRequest, PageParams>('agendamentos', agendaApi);

export const agendaKeys = hooks.keys;
export const useAgendamentos = hooks.useList;
export const useAgendamento = hooks.useDetail;
export const useCreateAgendamento = hooks.useCreate;
export const useUpdateAgendamento = hooks.useUpdate;
export const useDeleteAgendamento = hooks.useRemove;

export function useAgendamentosPeriodo(inicio: string, fim: string) {
  return useQuery({
    queryKey: [...agendaKeys.all, 'periodo', inicio, fim],
    queryFn: () => agendaApi.periodo(inicio, fim),
    enabled: !!inicio && !!fim,
  });
}

export function useAtualizarStatusAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: AgendamentoStatus }) => agendaApi.atualizarStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: agendaKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
