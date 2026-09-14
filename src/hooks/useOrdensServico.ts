import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordensServicoApi, type OrdensServicoListParams } from '@/api/endpoints/ordensServico';
import { ordemServicoPublicoApi } from '@/api/endpoints/ordemServicoPublico';
import type { OrdemServicoRequest, OrdemServicoResponse, OrdemServicoStatus } from '@/api/types';
import { createCrudHooks } from './factory';
import { orcamentosKeys } from './useOrcamentos';

const hooks = createCrudHooks<OrdemServicoResponse, OrdemServicoRequest, OrdensServicoListParams>(
  'ordens-servico',
  ordensServicoApi,
);

export const ordensServicoKeys = hooks.keys;
export const useOrdensServico = hooks.useList;
export const useOrdemServico = hooks.useDetail;
export const useCreateOrdemServico = hooks.useCreate;
export const useUpdateOrdemServico = hooks.useUpdate;

export function useCriarOSAPartirDeOrcamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orcamentoId,
      usuarioResponsavelId,
    }: {
      orcamentoId: number;
      usuarioResponsavelId?: number;
    }) => {
      const os = await ordensServicoApi.criarAPartirDeOrcamento(orcamentoId, usuarioResponsavelId);
      // O cliente já aprovou o orçamento de origem (é pré-requisito pra essa
      // conversão) e os itens vêm copiados 1:1, sem edição possível nesse
      // endpoint — exigir uma segunda aprovação da OS recém-criada duplicaria
      // um "sim" que o cliente já deu, e deixava a OS presa em Aberta, fora
      // da fila do técnico (que só lista Aprovada/Em Andamento/Pausada/
      // Aguardando Peça).
      //
      // Passa por "enviar" antes do PATCH pra Aprovada — não é possível pular
      // direto de Aberta — porque "enviar" é o único jeito de gerar o
      // tokenAprovacao (ver comentário em OrdemServicoFormPage#podeEnviar).
      // Sem esse token, um edit futuro que reverte essa OS pra Aguardando
      // Aprovação (o backend faz isso sozinho num PUT sobre uma OS Aprovada)
      // ficaria sem link nenhum pra reenviar ao cliente.
      //
      // O backend deveria aceitar Aguardando Aprovação -> Aprovada no PATCH
      // /status genérico direto — mas isso já voltou a falhar silenciosamente
      // em produção mais de uma vez (OS-000010, OS-000009: token gerado,
      // status nunca sai de Aguardando Aprovação), então não confiamos só
      // nele. Se o PATCH falhar, cai pro caminho que é comprovado que
      // funciona: o mesmo endpoint público que o cliente usaria pra aprovar,
      // com o token que "enviar" acabou de gerar — equivalente a simular o
      // clique do cliente, já que ele já deu o "sim" no orçamento de origem.
      if (os.id != null && os.status === 'ABERTA') {
        try {
          const enviada = await ordensServicoApi.enviar(os.id);
          try {
            return await ordensServicoApi.atualizarStatus(os.id, 'APROVADA');
          } catch {
            if (!enviada.tokenAprovacao) return enviada;
            await ordemServicoPublicoApi.aprovar(enviada.tokenAprovacao);
            // ordemServicoPublicoApi.aprovar devolve o formato enxuto da tela
            // pública — busca de novo pelo endpoint autenticado pra manter o
            // retorno desse hook sempre como OrdemServicoResponse completo.
            return await ordensServicoApi.get(os.id);
          }
        } catch {
          // "enviar" em si falhou (ou o fallback também falhou) — não
          // tratamos como falha da conversão. A OS existe de verdade, só
          // fica parada esperando ação manual pela tela da OS, em vez de
          // virar um erro que faria a auto-conversão tentar recriar a partir
          // do mesmo orçamento (que já virou CONVERTIDO e rejeitaria a
          // tentativa).
          return os;
        }
      }
      return os;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ordensServicoKeys.all });
      // O orçamento de origem muda de status (vira CONVERTIDO) nessa mesma
      // chamada — sem isso, a lista de orçamentos ficava mostrando "Aprovado"
      // (com o botão de converter) mesmo depois de já virar OS.
      qc.invalidateQueries({ queryKey: orcamentosKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

export function useAtualizarStatusOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrdemServicoStatus }) =>
      ordensServicoApi.atualizarStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useEnviarOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordensServicoApi.enviar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useTimerStartOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordensServicoApi.timerStart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useTimerPauseOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => ordensServicoApi.timerPause(id, motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useTimerResumeOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordensServicoApi.timerResume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
