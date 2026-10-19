import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/formatters';
import {
  diasParaVencimento,
  ordenarPorVencimento,
  resumirPorSituacao,
  situacaoDaConta,
  textoVencimento,
} from '@/features/financeiro/contasUtils';

const MAX_LINHAS = 5;

// Em memória de propósito: a sessão do app vive em memória (token), então
// "uma vez por sessão" é uma vez por login — entrar de novo avisa de novo. A
// chave é o token, pra um segundo login na mesma aba também ser avisado.
let avisadoParaToken: string | null = null;

/**
 * Aviso de contas vencidas, logo ao entrar no sistema, pra quem tem acesso ao
 * financeiro (FINANCEIRO_READ — o nome do perfil é texto livre, então não dá
 * pra travar em "Admin"). Aparece uma vez por sessão; "Lembrar depois" só
 * fecha, e a faixa dentro do Financeiro continua mostrando a pendência.
 */
export function VencidasDialog() {
  const token = useAuthStore((s) => s.token);
  const podeVer = useAuthStore((s) => s.hasPermission('FINANCEIRO_READ'));
  const navigate = useNavigate();
  const [fechado, setFechado] = useState(false);

  const pagar = useTodasContasPagar({ enabled: podeVer, silentError: true });
  const receber = useTodasContasReceber({ enabled: podeVer, silentError: true });

  const resumoPagar = useMemo(() => resumirPorSituacao(pagar.data ?? []), [pagar.data]);
  const resumoReceber = useMemo(() => resumirPorSituacao(receber.data ?? []), [receber.data]);
  const maisAntigas = useMemo(() => {
    const vencidas = [
      ...(pagar.data ?? []).filter((c) => situacaoDaConta(c) === 'vencida').map((c) => ({ tipo: 'pagar' as const, conta: c })),
      ...(receber.data ?? []).filter((c) => situacaoDaConta(c) === 'vencida').map((c) => ({ tipo: 'receber' as const, conta: c })),
    ];
    return ordenarPorVencimento(vencidas.map((v) => ({ ...v, dataVencimento: v.conta.dataVencimento }))).slice(0, MAX_LINHAS);
  }, [pagar.data, receber.data]);

  const totalVencidas = resumoPagar.vencida.quantidade + resumoReceber.vencida.quantidade;
  const carregado = pagar.isSuccess && receber.isSuccess;
  const aberto = podeVer && carregado && totalVencidas > 0 && !fechado && avisadoParaToken !== token;

  function fechar() {
    avisadoParaToken = token;
    setFechado(true);
  }

  function verContas(aba: 'pagar' | 'receber') {
    fechar();
    navigate(`/financeiro?aba=${aba}&situacao=vencida`);
  }

  const linhaResumo = (
    aba: 'pagar' | 'receber',
    resumo: { quantidade: number; valor: number },
    Icone: typeof ArrowDownCircle,
    rotulo: string,
  ) =>
    resumo.quantidade > 0 && (
      <button
        type="button"
        onClick={() => verContas(aba)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-danger/50 hover:bg-surface-alt"
      >
        <Icone size={20} className="shrink-0 text-danger" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{rotulo}</span>
          <span className="block text-sm text-ink-muted">
            {resumo.quantidade} {resumo.quantidade === 1 ? 'conta' : 'contas'}
          </span>
        </span>
        <span className="text-base font-bold text-danger">{formatCurrency(resumo.valor)}</span>
        <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />
      </button>
    );

  return (
    <Modal open={aberto} onClose={fechar} size="md" centered>
      <div role="alertdialog" aria-label="Contas vencidas" className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-danger dark:bg-red-900/40">
            <AlertTriangle size={28} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-ink">
            {totalVencidas === 1 ? 'Você tem 1 conta vencida' : `Você tem ${totalVencidas} contas vencidas`}
          </h2>
          <p className="text-sm text-ink-muted">Regularize para manter o financeiro da oficina em dia.</p>
        </div>

        <div className="flex flex-col gap-2">
          {linhaResumo('pagar', resumoPagar.vencida, ArrowDownCircle, 'A pagar vencidas')}
          {linhaResumo('receber', resumoReceber.vencida, ArrowUpCircle, 'A receber vencidas')}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Mais antigas</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {maisAntigas.map(({ tipo, conta }) => (
              <li key={`${tipo}-${conta.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{conta.descricao}</span>
                  <span className="block text-xs text-danger">
                    {tipo === 'pagar' ? 'A pagar' : 'A receber'} · {textoVencimento(diasParaVencimento(conta))}
                  </span>
                </span>
                <span className="font-semibold text-ink">{formatCurrency(conta.valor)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={fechar}>
            Lembrar depois
          </Button>
          <Button onClick={() => verContas(resumoPagar.vencida.quantidade > 0 ? 'pagar' : 'receber')}>Ver contas vencidas</Button>
        </div>
      </div>
    </Modal>
  );
}
