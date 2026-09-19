import { useMemo, useState } from 'react';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAgendamentosPeriodo, useAtualizarStatusAgendamento } from '@/hooks/useAgenda';
import type { AgendamentoResponse, AgendamentoStatus } from '@/api/types';
import { agendamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { AgendamentoFormModal } from './AgendamentoFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { motion } from 'framer-motion';

const statusOptions: AgendamentoStatus[] = ['AGENDADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];

export function AgendaPage() {
  const [dia, setDia] = useState(() => new Date());
  const [modalAgendamento, setModalAgendamento] = useState<AgendamentoResponse | null | undefined>(undefined);

  const inicio = useMemo(() => startOfDay(dia).toISOString(), [dia]);
  const fim = useMemo(() => endOfDay(dia).toISOString(), [dia]);
  const { data, isLoading } = useAgendamentosPeriodo(inicio, fim);
  const atualizarStatus = useAtualizarStatusAgendamento();

  const ordenados = useMemo(
    () => [...(data ?? [])].sort((a, b) => (a.dataHora ?? '').localeCompare(b.dataHora ?? '')),
    [data],
  );

  async function handleStatusChange(id: number, status: AgendamentoStatus) {
    try {
      await atualizarStatus.mutateAsync({ id, status });
      toast.success('Status atualizado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível atualizar o status.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Agendamentos de serviços"
        action={
          <Button onClick={() => setModalAgendamento(null)}>
            <Plus size={18} /> Novo agendamento
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
        <Button size="sm" variant="ghost" onClick={() => setDia((d) => addDays(d, -1))} aria-label="Dia anterior">
          <ChevronLeft size={18} />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize text-ink">{format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          <button onClick={() => setDia(new Date())} className="text-xs text-brand-700 underline underline-offset-2">
            Hoje
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setDia((d) => addDays(d, 1))} aria-label="Próximo dia">
          <ChevronRight size={18} />
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : ordenados.length === 0 ? (
        <Card>
          <EmptyState icon={Clock} title="Nenhum agendamento neste dia" description="Clique em “Novo agendamento” para criar um." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenados.map((ag, idx) => {
            const meta = metaFor(agendamentoStatusMeta, ag.status);
            return (
              <motion.div key={ag.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                <Card>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button className="flex flex-1 items-start gap-3 text-left" onClick={() => setModalAgendamento(ag)}>
                      <div className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <span className="text-sm font-semibold">
                          {ag.dataHora ? format(new Date(ag.dataHora), 'HH:mm') : '--:--'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {ag.clienteNome} · {ag.veiculoPlaca}
                        </p>
                        <p className="truncate text-sm text-ink-muted">
                          {ag.servicos?.map((s) => s.nome).join(', ') || 'Sem serviços definidos'}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <Select
                        className="w-auto"
                        value={ag.status}
                        onChange={(e) => handleStatusChange(ag.id!, e.target.value as AgendamentoStatus)}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {metaFor(agendamentoStatusMeta, s).label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AgendamentoFormModal
        open={modalAgendamento !== undefined}
        onClose={() => setModalAgendamento(undefined)}
        agendamento={modalAgendamento}
        defaultDate={format(dia, "yyyy-MM-dd'T'HH:mm")}
      />
    </div>
  );
}
