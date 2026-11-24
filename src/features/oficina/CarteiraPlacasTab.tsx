import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { useCarteiraPlacas, useExtratoPlacas } from '@/hooks/usePlacas';
import { formatCentavos, formatDateTime } from '@/lib/formatters';
import { MENSAGEM_RECARGA_PLACAS_EM_BREVE, webhookPagBankLiberado } from '@/lib/liberacaoPagamentos';
import type { EstadoCarteiraPlacas, LancamentoCarteiraResponse, TipoLancamentoCarteira } from '@/api/types';
import { RecargaPlacasModal } from './RecargaPlacasModal';

const ESTADO_CARTEIRA_META: Record<EstadoCarteiraPlacas, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  OK: { label: 'Saldo ok', tone: 'success' },
  CRITICO: { label: 'Saldo crítico', tone: 'warning' },
  ESGOTADO: { label: 'Sem saldo', tone: 'danger' },
};

const TIPO_LABEL: Record<TipoLancamentoCarteira, string> = {
  RECARGA: 'Recarga',
  CONSUMO: 'Consulta',
  ESTORNO: 'Estorno',
  AJUSTE_CREDITO: 'Ajuste (crédito)',
  AJUSTE_DEBITO: 'Ajuste (débito)',
};

const CREDITOS: TipoLancamentoCarteira[] = ['RECARGA', 'ESTORNO', 'AJUSTE_CREDITO'];

export function CarteiraPlacasTab() {
  const { data: carteira, isLoading } = useCarteiraPlacas();
  const [page, setPage] = useState(0);
  const { data: extrato, isLoading: carregandoExtrato } = useExtratoPlacas({ page, size: 10 });
  const [recarregando, setRecarregando] = useState(false);

  if (isLoading || !carteira) return <PageSpinner />;

  const meta = ESTADO_CARTEIRA_META[carteira.estado];
  const recargaLiberada = webhookPagBankLiberado();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Wallet size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">Créditos de consulta de placa</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="text-sm text-ink-muted">Preenche marca, modelo, ano e cor ao cadastrar um veículo.</p>
              </div>
            </div>
            <Button type="button" onClick={() => setRecarregando(true)} disabled={!recargaLiberada}>
              Recarregar
            </Button>
          </div>

          {!recargaLiberada && (
            <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
              {MENSAGEM_RECARGA_PLACAS_EM_BREVE}
            </p>
          )}

          {carteira.estado !== 'OK' && (
            <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {carteira.estado === 'ESGOTADO'
                ? 'Sem saldo: as consultas automáticas estão pausadas. O cadastro manual continua funcionando.'
                : recargaLiberada
                  ? 'Saldo crítico — novas consultas poderão ser interrompidas. Recarregue para continuar.'
                  : 'Saldo crítico — novas consultas poderão ser interrompidas.'}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-muted">Saldo</p>
              <p className="text-sm font-medium text-ink">{formatCentavos(carteira.saldoCentavos)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Consultas restantes</p>
              <p className="text-sm font-medium text-ink">{carteira.consultasRestantes}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Preço por consulta</p>
              <p className="text-sm font-medium text-ink">{formatCentavos(carteira.precoConsultaCentavos)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <DataTable<LancamentoCarteiraResponse>
          loading={carregandoExtrato}
          rows={extrato?.content ?? []}
          rowKey={(l) => l.id}
          emptyTitle="Nenhum lançamento ainda"
          emptyDescription="Recargas e consultas aparecem aqui."
          columns={[
            { header: 'Data', render: (l) => formatDateTime(l.data) },
            { header: 'Tipo', render: (l) => TIPO_LABEL[l.tipo] ?? l.tipo },
            { header: 'Placa', hideBelow: 'sm', render: (l) => l.placa ?? '—' },
            {
              header: 'Valor',
              render: (l) => (
                <span className={CREDITOS.includes(l.tipo) ? 'text-green-700 dark:text-green-400' : 'text-ink'}>
                  {CREDITOS.includes(l.tipo) ? '+' : '−'}
                  {formatCentavos(l.valorCentavos)}
                </span>
              ),
            },
            { header: 'Saldo após', hideBelow: 'md', render: (l) => formatCentavos(l.saldoAposCentavos) },
          ]}
        />
        {extrato && extrato.totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={extrato.totalPages}
            totalElements={extrato.totalElements}
            onChange={setPage}
          />
        )}
      </Card>

      <RecargaPlacasModal open={recarregando} onClose={() => setRecarregando(false)} carteira={carteira} />
    </div>
  );
}
