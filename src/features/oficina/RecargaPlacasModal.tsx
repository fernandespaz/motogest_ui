import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { placasKeys, useCriarRecargaPlacas, useRecargaPlacas } from '@/hooks/usePlacas';
import { extractErrorMessage } from '@/api/client';
import { formatCentavos, formatDateTime } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import type { CarteiraPlacasResponse, StatusRecargaPlacas } from '@/api/types';

const SUGESTOES_CENTAVOS = [1000, 2000, 5000];

const STATUS_META: Record<StatusRecargaPlacas, { label: string; tone: 'warning' | 'success' | 'neutral' | 'danger' }> = {
  PENDENTE: { label: 'Aguardando pagamento', tone: 'warning' },
  PAGA: { label: 'Pago', tone: 'success' },
  EXPIRADA: { label: 'Expirado', tone: 'neutral' },
  RECUSADA: { label: 'Recusado', tone: 'danger' },
};

/** Valor digitado em reais ("12,50") → centavos inteiros; NaN/vazio → 0. */
export function reaisParaCentavos(texto: string): number {
  const n = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function RecargaPlacasModal({
  open,
  onClose,
  carteira,
}: {
  open: boolean;
  onClose: () => void;
  carteira: CarteiraPlacasResponse;
}) {
  const [valorTexto, setValorTexto] = useState('');
  const [recargaId, setRecargaId] = useState<number | undefined>();
  const qc = useQueryClient();
  const criar = useCriarRecargaPlacas();
  // Só acompanha enquanto o modal está aberto: fechar interrompe o polling.
  const { data: recarga } = useRecargaPlacas(open ? recargaId : undefined);

  const centavos = reaisParaCentavos(valorTexto);
  const foraDoLimite = centavos < carteira.recargaMinimaCentavos || centavos > carteira.recargaMaximaCentavos;

  function fechar() {
    // O Pix pode ser pago depois de fechar o modal: garante que o saldo seja relido.
    qc.invalidateQueries({ queryKey: placasKeys.carteira });
    setRecargaId(undefined);
    setValorTexto('');
    criar.reset();
    onClose();
  }

  async function gerar() {
    try {
      const r = await criar.mutateAsync(centavos);
      setRecargaId(r.id);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o Pix.'));
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Código Pix copiado.');
    } catch {
      // Sem permissão de clipboard o código segue visível para cópia manual.
    }
  }

  const resultado = recarga ?? criar.data;
  const meta = resultado ? STATUS_META[resultado.status] : undefined;

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Recarregar créditos de consulta"
      footer={
        resultado ? (
          <Button type="button" onClick={fechar}>
            Fechar
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={fechar} disabled={criar.isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={gerar} loading={criar.isPending} disabled={foraDoLimite}>
              Gerar Pix
            </Button>
          </>
        )
      }
    >
      {resultado && meta ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <p className="text-lg font-semibold text-ink">{formatCentavos(resultado.valorCentavos)}</p>

          {resultado.status === 'PENDENTE' && (
            <>
              {resultado.qrCodeImageUrl && (
                <img
                  src={resultado.qrCodeImageUrl}
                  alt="QR Code para recarga via Pix"
                  className="h-48 w-48 rounded-lg border border-border bg-white p-2"
                />
              )}
              {resultado.qrCodeText && (
                <div className="flex w-full flex-col gap-1 text-left">
                  <p className="text-xs text-ink-muted">Pix copia e cola</p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2">
                    <code className="flex-1 truncate text-xs text-ink">{resultado.qrCodeText}</code>
                    <button
                      type="button"
                      onClick={() => copiar(resultado.qrCodeText!)}
                      className="shrink-0 text-brand-600 hover:text-brand-700"
                      aria-label="Copiar código Pix"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}
              <p className="flex items-center gap-2 text-xs text-ink-muted">
                <Spinner /> Aguardando a confirmação do pagamento
                {resultado.expiraEm && ` · expira em ${formatDateTime(resultado.expiraEm)}`}
              </p>
            </>
          )}
          {resultado.status === 'PAGA' && (
            <p className="text-sm text-ink-muted">Pagamento confirmado — os créditos já estão na carteira.</p>
          )}
          {(resultado.status === 'EXPIRADA' || resultado.status === 'RECUSADA') && (
            <p className="text-sm text-ink-muted">
              {resultado.mensagemErro ?? 'Esta recarga não foi concluída. Gere um novo Pix.'}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">
            Cada consulta de placa custa {formatCentavos(carteira.precoConsultaCentavos)}. Recarga mínima de{' '}
            {formatCentavos(carteira.recargaMinimaCentavos)} e máxima de{' '}
            {formatCentavos(carteira.recargaMaximaCentavos)}.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES_CENTAVOS.filter(
              (v) => v >= carteira.recargaMinimaCentavos && v <= carteira.recargaMaximaCentavos,
            ).map((v) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={centavos === v ? 'primary' : 'outline'}
                onClick={() => setValorTexto(String(v / 100).replace('.', ','))}
              >
                {formatCentavos(v)}
              </Button>
            ))}
          </div>
          <Input
            label="Outro valor (R$)"
            inputMode="decimal"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value.replace(/[^0-9,]/g, ''))}
            placeholder="0,00"
          />
          {valorTexto && foraDoLimite && (
            <p className="text-xs font-medium text-danger">Valor fora do permitido.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
