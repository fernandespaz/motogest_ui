import { useRef } from 'react';
import { useCarteiraPlacas, useConsultarChassi, useConsultarPlaca } from '@/hooks/usePlacas';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage, getBusinessErrorCode } from '@/api/client';
import { normalizarPlaca, placaValida } from '@/lib/placa';
import { webhookPagBankLiberado } from '@/lib/liberacaoPagamentos';
import { toast } from '@/store/toastStore';
import type { ConsultaPlacaResponse } from '@/api/types';

export type DadosPlaca = Pick<
  ConsultaPlacaResponse,
  'marca' | 'modelo' | 'anoFabricacao' | 'anoModelo' | 'cor' | 'chassi'
>;

/** O que a consulta entrega a quem chama: os campos do veículo e a placa (normalizada) a que se referem. */
export type DadosPlacaConsultada = DadosPlaca & { placa?: string };

/**
 * Lógica da consulta de placa, compartilhada pelas telas que a oferecem (hero
 * do cadastro de veículo e o botão compacto dos formulários de cliente). Sempre
 * sob demanda: cada consulta pode debitar da carteira da oficina, então nada
 * aqui dispara sozinho. `disponivel=false` (feature desligada, sem permissão
 * ou carteira indisponível) significa "siga com o cadastro manual".
 */
export function usePlacaConsulta(
  placa: string | undefined,
  onDados: (dados: DadosPlacaConsultada) => void,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const podeCadastrar = useAuthStore((s) => s.hasPermission('VEICULO_WRITE'));
  // Sem recarga liberada (webhook de produção do PagBank pendente) o link levaria a um botão desabilitado.
  const podeRecarregar = useAuthStore((s) => s.hasPermission('PLACAS_CARTEIRA')) && webhookPagBankLiberado();
  // `enabled` evita buscar a carteira quando a tela que usa o hook não vai oferecer a consulta (modal fechado, edição).
  const { data: carteira } = useCarteiraPlacas({ enabled });
  const consultar = useConsultarPlaca();
  const consultarChassi = useConsultarChassi();

  const normalizada = normalizarPlaca(placa);
  // A resposta pode chegar depois de o usuário trocar a placa ou fechar a tela: só aplica se ainda for a mesma placa.
  const placaAtual = useRef(normalizada);
  placaAtual.current = normalizada;
  const valida = placaValida(placa);
  const disponivel = podeCadastrar && !!carteira?.consultaAutomaticaDisponivel;
  // O resultado só vale para a placa atualmente digitada.
  const resultado = consultar.data?.placa === normalizada ? consultar.data : undefined;
  const chassiDestaPlaca = consultarChassi.data?.placa === normalizada ? consultarChassi.data : undefined;
  const totalCobradoCentavos = (resultado?.valorCobradoCentavos ?? 0) + (chassiDestaPlaca?.valorCobradoCentavos ?? 0);

  function tratarErro(error: unknown) {
    const negocio = getBusinessErrorCode(error);
    if (negocio?.codigo === 'SALDO_PLACAS_INSUFICIENTE') {
      toast.error('Saldo de consultas insuficiente. Preencha manualmente ou recarregue os créditos.');
    } else if (negocio?.codigo === 'CONSULTA_PLACA_INDISPONIVEL') {
      toast.error('Consulta de placa indisponível no momento. Preencha manualmente.');
    } else {
      toast.error(extractErrorMessage(error, 'Não foi possível consultar a placa. Preencha manualmente.'));
    }
  }

  async function buscar() {
    try {
      const r = await consultar.mutateAsync(normalizada);
      if (r.encontrada && placaAtual.current === normalizada) onDados(r);
    } catch (error) {
      tratarErro(error);
    }
  }

  async function buscarChassi() {
    try {
      const r = await consultarChassi.mutateAsync(normalizada);
      if (r.chassi && placaAtual.current === normalizada) onDados({ chassi: r.chassi, placa: normalizada });
    } catch (error) {
      tratarErro(error);
    }
  }

  return {
    disponivel,
    carteira,
    podeRecarregar,
    valida,
    normalizada,
    resultado,
    totalCobradoCentavos,
    esgotado: carteira?.estado === 'ESGOTADO',
    buscando: consultar.isPending,
    buscandoChassi: consultarChassi.isPending,
    ocupado: consultar.isPending || consultarChassi.isPending,
    buscar,
    buscarChassi,
    /** Limpa os resultados — chamado ao abrir a tela, para não herdar a consulta da abertura anterior. */
    reset: () => {
      consultar.reset();
      consultarChassi.reset();
    },
  };
}
