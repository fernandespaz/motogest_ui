import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import { orcamentosKeys } from './useOrcamentos';
import { useCriarOSAPartirDeOrcamento } from './useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

const PARAMS = { page: 0, size: 50, sort: 'id,desc' } as const;

/**
 * O cliente aprova o orçamento por um link público (sem login) — a API que
 * cria a Ordem de Serviço exige token de staff, então o clique do cliente
 * sozinho não tem como gerar a OS (ver /api/v1/ordens-servico/a-partir-de-orcamento,
 * protegida por bearerAuth, contra /api/v1/public/orcamentos/{token}/aprovar,
 * pública). Em vez de depender de alguém lembrar de clicar em "Converter em
 * OS", qualquer sessão autenticada da oficina — montada uma vez no AppShell,
 * então roda em qualquer tela — detecta orçamentos aprovados e converte na
 * hora, com um novo poll a cada 30s pra pegar aprovações que aconteceram
 * enquanto a aba já estava aberta.
 */
export function useAutoConversaoOrcamentosAprovados() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const habilitado = hasPermission('ORCAMENTO_READ') && hasPermission('ORDEM_SERVICO_WRITE');

  const { data } = useQuery({
    queryKey: orcamentosKeys.list(PARAMS),
    queryFn: () => orcamentosApi.list(PARAMS),
    enabled: habilitado,
    refetchInterval: habilitado ? 30_000 : false,
    meta: { silentError: true },
  });

  const criarOS = useCriarOSAPartirDeOrcamento();
  const emAndamento = useRef(new Set<number>());

  useEffect(() => {
    if (!habilitado) return;
    const aprovados = (data?.content ?? []).filter((o) => o.status === 'APROVADO' && o.id != null);
    for (const orcamento of aprovados) {
      const id = orcamento.id!;
      if (emAndamento.current.has(id)) continue;
      emAndamento.current.add(id);
      criarOS.mutate(
        { orcamentoId: id },
        {
          onSuccess: (os) => {
            toast.success(`Orçamento #${id} aprovado pelo cliente — Ordem de Serviço #${os.id} criada automaticamente.`);
          },
          onError: () => {
            // libera pra tentar de novo no próximo poll, em vez de desistir
            // silenciosamente pro resto da sessão
            emAndamento.current.delete(id);
          },
        },
      );
    }
  }, [data, habilitado, criarOS]);
}
