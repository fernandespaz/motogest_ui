import axios from 'axios';
import { extractErrorMessage } from '@/api/client';
import type { NfseResponse } from '@/api/types';
import type { Alerta } from './useAlerta';

/**
 * Converte um erro de chamada fiscal em alerta. O backend devolve `message` já
 * em português nos 422 e `details` ("campo: mensagem") nos 400 — os detalhes
 * vão em lista pra o usuário ver qual campo corrigir.
 */
export function alertaDeErro(error: unknown, titulo: string, fallback: string): Alerta {
  const detalhes = axios.isAxiosError(error)
    ? ((error.response?.data as { details?: unknown } | undefined)?.details as unknown)
    : undefined;
  return {
    tone: 'danger',
    title: titulo,
    message: extractErrorMessage(error, fallback),
    detalhes: Array.isArray(detalhes) ? detalhes.filter((d): d is string => typeof d === 'string') : undefined,
  };
}

/** Alerta que traduz o `status` devolvido ao emitir/atualizar — o backend responde 201/200 para qualquer resultado. */
export function alertaDeStatusNfse(nota: NfseResponse): Alerta {
  const homologacao = nota.ambiente === 'HOMOLOGACAO' ? ' Nota de TESTE: sem validade fiscal.' : '';
  switch (nota.status) {
    case 'AUTORIZADA':
      return {
        tone: 'success',
        title: 'NFS-e autorizada',
        message: `Nota ${nota.numero ? `nº ${nota.numero} ` : ''}emitida com sucesso.${homologacao}`,
      };
    case 'REJEITADA':
      return {
        tone: 'danger',
        title: 'NFS-e rejeitada pelo governo',
        message: nota.mensagem ?? 'O governo recusou a nota. Corrija os dados e emita novamente.',
      };
    case 'ERRO':
      return {
        tone: 'danger',
        title: 'Não foi possível emitir a NFS-e',
        message: nota.mensagem ?? 'Ocorreu uma falha na emissão. Nenhuma nota foi gerada; tente novamente.',
      };
    case 'CANCELADA':
      return { tone: 'info', title: 'NFS-e cancelada', message: nota.mensagem ?? 'Esta nota está cancelada.' };
    default:
      return {
        tone: 'warning',
        title: 'Aguardando confirmação do governo',
        message:
          'O resultado ainda não foi confirmado e a nota pode já ter sido emitida. ' +
          'Use "Atualizar status" mais tarde para conferir — não emita novamente.',
      };
  }
}
