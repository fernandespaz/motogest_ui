import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowCounterClockwise, FileArrowDown } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { useCaixaSessaoEventos, useReabrirCaixaSessao } from '@/hooks/useFinanceiro';
import { caixaApi } from '@/api/endpoints/caixa';
import { baixarExportacaoCaixa } from './caixaExport';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { caixaSessaoStatusMeta, metaFor } from '@/lib/statusMeta';
import { FORMAS_PAGAMENTO } from '@/lib/formaPagamento';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CaixaSessaoResponse, SaldoPorFormaPagamentoResponse } from '@/api/types';

const reaberturaSchema = z.object({ motivo: z.string().min(1, 'Informe o motivo da reabertura') });
type ReaberturaValues = z.infer<typeof reaberturaSchema>;

const eventoLabel: Record<string, string> = {
  ABERTURA: 'Abertura',
  FECHAMENTO: 'Fechamento',
  REABERTURA: 'Reabertura',
};

const linhas: { key: keyof SaldoPorFormaPagamentoResponse; label: string }[] = [
  ...FORMAS_PAGAMENTO.map(({ chave, label }) => ({ key: chave, label })),
  { key: 'total', label: 'Total' },
];

export function CaixaSessaoDetalheModal({
  sessao,
  onClose,
}: {
  sessao: CaixaSessaoResponse | null;
  onClose: () => void;
}) {
  const [reabrindo, setReabrindo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { data: eventos, isLoading: carregandoEventos } = useCaixaSessaoEventos(sessao?.id);
  const reabrir = useReabrirCaixaSessao();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReaberturaValues>({ resolver: zodResolver(reaberturaSchema) });

  function fecharReabertura() {
    reset();
    setReabrindo(false);
  }

  async function onSubmitReabertura(values: ReaberturaValues) {
    if (!sessao?.id) return;
    try {
      await reabrir.mutateAsync({ id: sessao.id, payload: values });
      toast.success('Caixa reaberto.');
      fecharReabertura();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível reabrir o caixa.'));
    }
  }

  async function exportar(formato: 'PDF' | 'XLSX') {
    if (!sessao?.id) return;
    setExportando(true);
    try {
      await baixarExportacaoCaixa(
        () => caixaApi.sessoes.exportar(sessao.id!, formato),
        `caixa-${sessao.identificador ?? sessao.id}`,
        formato,
      );
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível exportar o comprovante.'));
    } finally {
      setExportando(false);
    }
  }

  if (!sessao) return null;
  const meta = metaFor(caixaSessaoStatusMeta, sessao.status);

  return (
    <Modal open={!!sessao} onClose={onClose} title={`Caixa ${sessao.identificador ?? `#${sessao.id}`}`} size="xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="text-sm text-ink-muted">
            Turno {sessao.turno} · Aberto por {sessao.abertoPorUsuarioNome} em {formatDateTime(sessao.abertoEm)}
          </span>
        </div>
        {sessao.status === 'FECHADO' && (
          <p className="text-sm text-ink-muted">
            Fechado por {sessao.fechadoPorUsuarioNome} em {formatDateTime(sessao.fechadoEm)}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 pr-3 font-semibold">Forma</th>
                <th className="py-2 pr-3 font-semibold">Inicial</th>
                <th className="py-2 pr-3 font-semibold">Entradas</th>
                <th className="py-2 pr-3 font-semibold">Saídas</th>
                <th className="py-2 pr-3 font-semibold">Atual</th>
                {sessao.status === 'FECHADO' && (
                  <>
                    <th className="py-2 pr-3 font-semibold">Informado</th>
                    <th className="py-2 pr-3 font-semibold">Divergência</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ key, label }) => {
                const divergencia = sessao.divergencia?.[key] ?? 0;
                return (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 font-medium text-ink">{label}</td>
                    <td className="py-2 pr-3">{formatCurrency(sessao.saldoInicial?.[key])}</td>
                    <td className="py-2 pr-3 text-success">{formatCurrency(sessao.totalEntradas?.[key])}</td>
                    <td className="py-2 pr-3 text-danger">{formatCurrency(sessao.totalSaidas?.[key])}</td>
                    <td className="py-2 pr-3 font-semibold">{formatCurrency(sessao.saldoAtual?.[key])}</td>
                    {sessao.status === 'FECHADO' && (
                      <>
                        <td className="py-2 pr-3">{formatCurrency(sessao.saldoFinalInformado?.[key])}</td>
                        <td className={`py-2 pr-3 font-medium ${Math.abs(divergencia) > 0.005 ? 'text-danger' : 'text-ink-muted'}`}>
                          {formatCurrency(divergencia)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sessao.observacaoFechamento && (
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Observação: </span>
            {sessao.observacaoFechamento}
          </p>
        )}
        {sessao.justificativaDivergencia && (
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Justificativa da divergência: </span>
            {sessao.justificativaDivergencia}
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Histórico de auditoria</p>
          {carregandoEventos ? (
            <Spinner size={18} />
          ) : (
            <ul className="flex flex-col gap-2">
              {(eventos ?? []).map((evento) => (
                <li key={evento.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge>{eventoLabel[evento.tipo ?? ''] ?? evento.tipo}</Badge>
                  <span className="text-ink">{evento.usuarioNome}</span>
                  <span className="text-ink-muted">{formatDateTime(evento.ocorridoEm)}</span>
                  {evento.observacao && <span className="text-ink-muted">— {evento.observacao}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {reabrindo ? (
          <form onSubmit={handleSubmit(onSubmitReabertura)} className="flex flex-col gap-3 rounded-lg border border-border p-3" noValidate>
            <Textarea
              label="Motivo da reabertura"
              required
              error={errors.motivo?.message}
              placeholder="Explique por que este caixa precisa ser reaberto..."
              {...register('motivo')}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={fecharReabertura} disabled={reabrir.isPending}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" loading={reabrir.isPending}>
                Confirmar reabertura
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {sessao.status === 'FECHADO' && (
              <Button variant="secondary" size="sm" onClick={() => setReabrindo(true)}>
                <ArrowCounterClockwise size={16} /> Reabrir
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => exportar('XLSX')} loading={exportando}>
              <FileArrowDown size={16} /> Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportar('PDF')} loading={exportando}>
              <FileArrowDown size={16} /> PDF
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
