/**
 * Os pagamentos online (recarga de créditos de placa por Pix e pagamento do
 * plano/licença) só são confirmados automaticamente quando o webhook de
 * produção do PagBank está no ar. Até lá as telas de pagamento mostram um
 * aviso de "em breve" (e a recarga de placas fica bloqueada). Para liberar:
 * defina VITE_PAGBANK_WEBHOOK_LIBERADO=true no ambiente de build e faça o
 * deploy — o aviso some de todas as telas de uma vez. (Para testar o fluxo em
 * desenvolvimento, crie um .env.local com a variável = true.)
 * Lida a cada chamada (não no import) para poder ser stubada nos testes.
 */
export function webhookPagBankLiberado(): boolean {
  return import.meta.env.VITE_PAGBANK_WEBHOOK_LIBERADO === 'true';
}

export const MENSAGEM_RECARGA_PLACAS_EM_BREVE =
  'A recarga de créditos por Pix estará liberada em breve. Por enquanto, o cadastro manual de veículos continua funcionando normalmente.';

export const MENSAGEM_PAGAMENTO_PLANO_EM_BREVE =
  'A confirmação automática dos pagamentos estará liberada em breve. Enquanto isso, a ativação do plano após o pagamento pode demorar — em caso de dúvida, fale com o suporte.';

