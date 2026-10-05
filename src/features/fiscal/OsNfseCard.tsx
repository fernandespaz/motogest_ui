import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import {
  PERMISSAO_FISCAL_CERTIFICADO,
  PERMISSAO_FISCAL_CONFIGURAR,
  PERMISSAO_FISCAL_EMITIR,
  useConfiguracaoFiscal,
  useEmitirNfse,
  useNotasFiscais,
} from '@/hooks/useFiscal';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDateTime, onlyDigits } from '@/lib/formatters';
import type { NfseResponse } from '@/api/types';
import { AmbienteBadge, NfseStatusBadge } from './NfseBadges';
import { NfseAcoesBotoes } from './NfseAcoesBotoes';
import { NfseDetalheModal } from './NfseDetalheModal';
import { useAlerta } from './useAlerta';
import { alertaDeErro, alertaDeStatusNfse } from './fiscalAlertas';
import { useErroComoAlerta } from './useErroComoAlerta';

/** Notas que "ocupam" a OS: o backend barra uma segunda emissão enquanto houver uma delas. */
const STATUS_ATIVOS = ['PENDENTE', 'PROCESSANDO', 'AUTORIZADA'];
const STATUS_OS_EMISSIVEIS = ['FATURADO', 'ENTREGUE'];

interface Props {
  ordemServicoId: number;
  status?: string;
  clienteDocumento?: string;
}

/**
 * Bloco "NFS-e" da tela da OS: botão de emitir (só em OS faturada/entregue, com
 * a configuração fiscal pronta e sem nota ativa) ou o cartão da nota existente.
 * Fica de fora por completo para quem não tem FISCAL_EMITIR — assim nenhuma
 * query fiscal dispara para esses perfis.
 */
export function OsNfseCard(props: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (!hasPermission(PERMISSAO_FISCAL_EMITIR) || !props.status || !STATUS_OS_EMISSIVEIS.includes(props.status)) {
    return null;
  }
  return <OsNfseCardConteudo {...props} />;
}

function OsNfseCardConteudo({ ordemServicoId, clienteDocumento }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const {
    data: config,
    isLoading: carregandoConfig,
    isError: erroConfig,
    error: erroConfigDetalhe,
    refetch: recarregarConfig,
  } = useConfiguracaoFiscal();
  const {
    data: notas,
    isLoading: carregandoNotas,
    isError: erroNotas,
    error: erroNotasDetalhe,
    refetch,
  } = useNotasFiscais({ ordemServicoId, size: 20 });
  const emitir = useEmitirNfse();
  const { mostrar, dialogo } = useAlerta();
  useErroComoAlerta(erroConfig, erroConfigDetalhe, 'Não foi possível verificar a situação fiscal', mostrar);
  useErroComoAlerta(erroNotas, erroNotasDetalhe, 'Não foi possível consultar as notas da OS', mostrar);
  const [confirmando, setConfirmando] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);

  const lista = notas?.content ?? [];
  const ativa = lista.find((n) => n.status && STATUS_ATIVOS.includes(n.status));
  // Mais recente primeiro: se não há nota ativa, a primeira é o último desfecho (rejeitada/erro/cancelada).
  const ultima: NfseResponse | undefined = ativa ?? lista[0];
  const podeConfigurar =
    hasPermission(PERMISSAO_FISCAL_CONFIGURAR) || hasPermission(PERMISSAO_FISCAL_CERTIFICADO);

  function pedirConfirmacao() {
    // Pré-checagem só quando o backend devolve o documento: evita ir ao governo
    // com um cadastro que sabidamente não passa (o backend valida os dígitos).
    const digitos = clienteDocumento ? onlyDigits(clienteDocumento) : undefined;
    if (digitos !== undefined && digitos.length !== 11 && digitos.length !== 14) {
      mostrar({
        tone: 'warning',
        title: 'Cliente sem CPF/CNPJ válido',
        message: 'A NFS-e exige o CPF ou CNPJ do cliente. Corrija o cadastro do cliente e tente emitir novamente.',
      });
      return;
    }
    setConfirmando(true);
  }

  async function confirmarEmissao() {
    try {
      const nota = await emitir.mutateAsync(ordemServicoId);
      setConfirmando(false);
      mostrar(alertaDeStatusNfse(nota));
    } catch (error) {
      setConfirmando(false);
      mostrar(alertaDeErro(error, 'Não foi possível emitir a NFS-e', 'Tente novamente em instantes.'));
      // Ex.: "Já existe uma NFS-e emitida ou em emissão" — a tela precisa passar a mostrar essa nota.
      void refetch();
    }
  }

  function corpo() {
    if (carregandoConfig || carregandoNotas) {
      return (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Spinner size={16} /> Verificando situação fiscal...
        </div>
      );
    }

    if (erroConfig || erroNotas) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">Não foi possível verificar a situação fiscal desta OS.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void recarregarConfig();
              void refetch();
            }}
          >
            Tentar de novo
          </Button>
        </div>
      );
    }

    if (ativa) return <NotaAtual nota={ativa} mostrar={mostrar} onDetalhes={setDetalheId} />;

    if (config?.provedorDisponivel === false) {
      return <p className="text-sm text-ink-muted">Emissão de NFS-e indisponível neste ambiente.</p>;
    }

    if (!config?.prontaParaEmitir) {
      const pendencias = config?.pendencias?.length ?? 0;
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {config?.emissaoHabilitada
              ? `A configuração fiscal tem ${pendencias} pendência${pendencias === 1 ? '' : 's'}.`
              : 'A emissão de NFS-e ainda não está habilitada para esta oficina.'}
          </p>
          {podeConfigurar && (
            <Link to="/fiscal" className="text-sm font-medium text-brand-700 hover:underline">
              Abrir configuração fiscal
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {ultima && <NotaAtual nota={ultima} mostrar={mostrar} onDetalhes={setDetalheId} resumida />}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            Somente os itens de serviço entram na nota — peças não.
            {config.ambiente === 'HOMOLOGACAO' && ' Ambiente de teste: a nota não tem validade fiscal.'}
          </p>
          <Button size="sm" onClick={pedirConfirmacao} loading={emitir.isPending}>
            <Receipt size={16} /> {ultima ? 'Emitir novamente' : 'Emitir NFS-e'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="NFS-e"
          subtitle="Nota fiscal de serviço desta ordem de serviço"
          action={<AmbienteBadge ambiente={ativa?.ambiente ?? config?.ambiente} />}
        />
        <CardBody>{corpo()}</CardBody>
      </Card>

      <ConfirmDialog
        open={confirmando}
        title="Emitir NFS-e?"
        description={
          'A nota será enviada ao governo com os itens de serviço desta OS.' +
          (config?.ambiente === 'HOMOLOGACAO'
            ? ' Ambiente de homologação: a nota é apenas um teste, sem validade fiscal.'
            : ' Em produção, a nota emitida tem validade fiscal e só pode ser desfeita por cancelamento.')
        }
        confirmLabel="Emitir nota"
        loading={emitir.isPending}
        onConfirm={confirmarEmissao}
        onCancel={() => setConfirmando(false)}
      />
      <NfseDetalheModal notaId={detalheId} onClose={() => setDetalheId(null)} mostrar={mostrar} />
      {dialogo}
    </>
  );
}

function NotaAtual({
  nota,
  mostrar,
  onDetalhes,
  resumida,
}: {
  nota: NfseResponse;
  mostrar: ReturnType<typeof useAlerta>['mostrar'];
  onDetalhes: (id: number) => void;
  /** Última tentativa sem sucesso (rejeitada/erro/cancelada): só status e motivo, sem as ações da nota. */
  resumida?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <NfseStatusBadge status={nota.status} />
        {nota.numero && <span className="text-sm font-medium text-ink">nº {nota.numero}</span>}
        <span className="text-sm text-ink-muted">
          {formatCurrency(nota.valorServicos)} · {formatDateTime(nota.dataSolicitacao)}
        </span>
      </div>
      {nota.status === 'PROCESSANDO' || nota.status === 'PENDENTE' ? (
        <p className="text-sm text-ink-muted">Aguardando confirmação do governo. Use "Atualizar status" para conferir.</p>
      ) : (
        nota.mensagem && <p className="text-sm text-ink-muted">{nota.mensagem}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!resumida && <NfseAcoesBotoes nota={nota} mostrar={mostrar} />}
        {nota.id != null && (
          <Button variant="ghost" size="sm" onClick={() => onDetalhes(nota.id as number)}>
            Ver histórico
          </Button>
        )}
      </div>
    </div>
  );
}
