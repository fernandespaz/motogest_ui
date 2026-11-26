import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { FileArrowDown, CheckCircle, XCircle, Wrench, Trash, ChatCircle } from '@phosphor-icons/react';
import { PageHeader } from '@/components/ui/PageHeader';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useTodosOrcamentos,
  useDeleteOrcamento,
  useEnviarOrcamento,
  useAprovarOrcamento,
  useRejeitarOrcamento,
} from '@/hooks/useOrcamentos';
import { useCriarOSAPartirDeOrcamento } from '@/hooks/useOrdensServico';
import type { OrcamentoResponse } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { orcamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { buildOrcamentoPdfBlob } from './orcamentoPdf';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { orcamentoSemCadastro, MENSAGEM_ENVIAR_SEM_CADASTRO } from './orcamentoModo';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { ModeloVeiculoThumb, useImagensPorVeiculoId } from '@/features/shared/ModeloVeiculoField';
import { useAuthStore } from '@/store/authStore';
import { isConsultor } from '@/lib/perfil';
import { resolverNomeFantasiaOficina } from '@/hooks/useOficina';

const TAMANHO_PAGINA = 20;

// Etapas do funil de orçamento, na ordem em que acontecem. Convertido some da lista (virou OS).
const FILTROS_STATUS = ['RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO'] as const;

function normalizar(texto: string | undefined | null) {
  return (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function OrcamentosPage() {
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<OrcamentoResponse | null>(null);
  const [rejeitando, setRejeitando] = useState<OrcamentoResponse | null>(null);
  // Guarda o último orçamento do diálogo: durante a animação de saída `rejeitando` já é null e o texto não pode virar "#undefined".
  const ultimoRejeitado = useRef<OrcamentoResponse | null>(null);
  if (rejeitando) ultimoRejeitado.current = rejeitando;
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const navigate = useNavigate();
  const perfil = useAuthStore((s) => s.perfil);
  const usuarioId = useAuthStore((s) => s.usuarioId);

  // GET /orcamentos não tem filtro de status nem de consultor no backend
  // (confirmado no openapi.json — o único parâmetro é paginação), então os
  // dois cortes abaixo são feitos no cliente. Filtrar uma página que o
  // SERVIDOR já paginou quebra a contagem por página (uma sobra 2 itens
  // depois do filtro, a seguinte 5...) — por isso useTodosOrcamentos busca o
  // conjunto inteiro uma vez e a paginação abaixo é inteiramente local, sobre
  // os dados já filtrados.
  //
  // IMPORTANTE: o filtro por consultor é só um recorte de UX pra evitar que
  // um consultor veja (e tente puxar) a carteira de outro no dia a dia
  // normal do app — não é controle de acesso de verdade. Alguém que chame
  // GET /orcamentos direto (fora da UI) continua recebendo a lista inteira,
  // porque ORCAMENTO_READ é uma permissão só, sem distinção entre "ver os
  // próprios" e "ver todos". Pra uma garantia real, o backend precisaria
  // escopar a listagem por consultor (mesmo caso do PRODUTIVIDADE_READ que já
  // foi ajustado com um endpoint "/me" — aqui precisaria de algo equivalente).
  const { data: todos, isLoading } = useTodosOrcamentos('id,desc');
  const imagensPorVeiculoId = useImagensPorVeiculoId();
  const carteira = useMemo(
    () =>
      (todos ?? []).filter(
        (o: OrcamentoResponse) =>
          o.status !== 'CONVERTIDO' && (!isConsultor(perfil) || usuarioId == null || o.consultorId === usuarioId),
      ),
    [todos, perfil, usuarioId],
  );
  // Busca por nº, cliente ou placa + etapa do funil, tudo no cliente (a API não filtra — ver comentário acima).
  const contagemPorStatus = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of carteira) c[o.status ?? ''] = (c[o.status ?? ''] ?? 0) + 1;
    return c;
  }, [carteira]);
  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return carteira.filter(
      (o: OrcamentoResponse) =>
        (!statusFiltro || o.status === statusFiltro) &&
        (!termo || normalizar([o.id, o.clienteNome, o.interessadoNome, o.veiculoPlaca].filter(Boolean).join(' ')).includes(termo)),
    );
  }, [carteira, busca, statusFiltro]);
  const temFiltro = busca.trim() !== '' || statusFiltro !== '';
  const totalElements = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / TAMANHO_PAGINA));
  // Depois de remover um orçamento (ou o filtro de carteira encolher a
  // lista), a página guardada em estado pode ficar maior que o total — sem
  // isso, a tabela mostraria "nenhum encontrado" em vez de voltar pra uma
  // página que existe.
  const paginaAtual = Math.min(page, totalPages - 1);
  const rows = filtrados.slice(paginaAtual * TAMANHO_PAGINA, (paginaAtual + 1) * TAMANHO_PAGINA);
  const deleteMutation = useDeleteOrcamento();
  const enviar = useEnviarOrcamento();
  const aprovar = useAprovarOrcamento();
  const rejeitar = useRejeitarOrcamento();
  const criarOS = useCriarOSAPartirDeOrcamento();

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Orçamento removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o orçamento.'));
    }
  }

  async function confirmarRejeicao() {
    if (!rejeitando?.id) return;
    try {
      await rejeitar.mutateAsync(rejeitando.id);
      toast.info('Orçamento rejeitado.');
      setRejeitando(null);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  async function baixarPdf(row: OrcamentoResponse) {
    try {
      await openPdfInNewTab(() => buildOrcamentoPdfBlob(row), `orcamento-${row.id}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  async function compartilharWhatsApp(row: OrcamentoResponse) {
    if (!row.tokenAprovacao) {
      toast.error('Envie o orçamento ao cliente antes de compartilhar o link.');
      return;
    }
    // Abre a aba em branco já no clique (preserva a ativação do usuário) e só
    // navega pra wa.me depois do await — do contrário o navegador bloqueia o
    // popup, já que ele deixaria de contar como resposta direta ao clique.
    const win = window.open('', '_blank');
    const nomeFantasia = await resolverNomeFantasiaOficina();
    const link = `${window.location.origin}/orcamentos/publico/${row.tokenAprovacao}`;
    const texto = `Olá! Aqui é da ${nomeFantasia}. Segue o orçamento nº ${row.id}${row.clienteNome ? ` para ${row.clienteNome}` : ''}, no valor de ${formatCurrency(row.valorTotal)}. Você pode conferir e aprovar por aqui: ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    if (win) win.location.href = url;
    else window.open(url, '_blank');
  }

  async function handleConverter(row: OrcamentoResponse) {
    try {
      const os = await criarOS.mutateAsync({ orcamentoId: row.id! });
      // useCriarOSAPartirDeOrcamento tenta promover a OS pra Aprovada sozinho,
      // mas engole qualquer falha nesse passo pra não travar a conversão em
      // si (ver comentário lá) — avisa aqui se não chegou em Aprovada, senão
      // a OS fica presa esperando ação manual sem o consultor saber.
      if (os.status === 'APROVADA') {
        toast.success('Ordem de Serviço criada a partir do orçamento.');
      } else {
        toast.error('OS criada, mas não foi possível aprová-la automaticamente. Envie/aprove manualmente.');
      }
      navigate(`/ordens-servico/${os.id}`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível converter em OS.'));
    }
  }

  // Enviar e compartilhar eram duas ações separadas — dava pra compartilhar o
  // link (o token já existe desde a criação) antes de marcar como enviado, e
  // aí o cliente abria um orçamento que a tela pública ainda tratava como
  // rascunho, sem opção de aprovar. Uma única ação resolve os dois passos
  // juntos, na ordem certa.
  // Enviar/aprovar exigem cliente e veículo cadastrados (o backend recusa com 422). Em vez de deixar o
  // consultor esbarrar no erro, explica e leva direto pro orçamento, onde está o "vincular cliente".
  function exigirCadastro(row: OrcamentoResponse): boolean {
    if (!orcamentoSemCadastro(row)) return true;
    toast.info(MENSAGEM_ENVIAR_SEM_CADASTRO);
    navigate(`/orcamentos/${row.id}`);
    return false;
  }

  async function handleEnviarECompartilhar(row: OrcamentoResponse) {
    if (!exigirCadastro(row)) return;
    try {
      const atualizado = await enviar.mutateAsync(row.id!);
      toast.success('Orçamento enviado — aguardando aprovação do cliente.');
      await compartilharWhatsApp(atualizado);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível enviar o orçamento.'));
    }
  }

  // Todo orçamento nasce em RASCUNHO e o backend só aceita APROVAR a partir
  // de ENVIADO (RASCUNHO -> ENVIADO -> APROVADO, ver openapi.json) — não existe
  // uma transição direta. Regra de negócio: a maioria dos orçamentos é feita
  // com o cliente já no balcão, então pedir aprovação por WhatsApp (que
  // "Enviar" acima sempre abre) é inviável. Aqui o consultor aprova
  // diretamente pelo cliente presencial: passa pelo ENVIADO só como transição
  // de estado interna, sem abrir o compartilhamento.
  async function handleAprovarNoBalcao(row: OrcamentoResponse) {
    if (!exigirCadastro(row)) return;
    let enviado: OrcamentoResponse;
    try {
      enviado = await enviar.mutateAsync(row.id!);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível aprovar o orçamento.'));
      return;
    }
    // A partir daqui o orçamento já virou ENVIADO de verdade no backend (a
    // invalidação da lista já dispara) — se o passo de aprovar falhar agora,
    // dizer "não foi possível aprovar" sem mais contexto esconderia que a
    // linha já mudou de status e ganhou os botões de Aprovar/Rejeitar do
    // ENVIADO, deixando o consultor sem saber que só falta um segundo clique.
    try {
      await aprovar.mutateAsync(enviado.id!);
      toast.success('Orçamento aprovado.');
    } catch (error) {
      toast.error(
        extractErrorMessage(error, 'Orçamento enviado, mas não foi possível aprovar automaticamente. Aprove pela linha (agora como Enviado).'),
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Propostas de serviços e produtos para clientes"
        action={
          <Button onClick={() => navigate('/orcamentos/novo')}>
            <Plus size={18} /> Novo orçamento
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={busca}
          onChange={(v) => {
            setBusca(v);
            setPage(0);
          }}
          placeholder="Buscar por nº, cliente ou placa..."
          className="w-full max-w-xs"
        />
        <div role="group" aria-label="Filtrar por etapa" className="flex min-w-0 max-w-full gap-1.5 overflow-x-auto no-scrollbar">
          {[{ valor: '', rotulo: 'Todos', total: carteira.length }, ...FILTROS_STATUS.map((s) => ({ valor: s, rotulo: metaFor(orcamentoStatusMeta, s).label, total: contagemPorStatus[s] ?? 0 }))].map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={statusFiltro === f.valor}
              onClick={() => {
                setStatusFiltro(f.valor);
                setPage(0);
              }}
              className={clsx(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                statusFiltro === f.valor
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border text-ink-muted hover:bg-surface-alt hover:text-ink',
              )}
            >
              {f.rotulo} <span className="tabular-nums opacity-80">({f.total})</span>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <DataTable<OrcamentoResponse>
          loading={isLoading}
          rows={rows}
          rowKey={(row) => row.id!}
          emptyTitle={temFiltro ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
          emptyDescription={temFiltro ? 'Ajuste a busca ou a etapa selecionada.' : 'Crie o primeiro orçamento para começar a cotar.'}
          emptyAction={
            temFiltro ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setBusca('');
                  setStatusFiltro('');
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => navigate('/orcamentos/novo')}>
                <Plus size={18} /> Novo orçamento
              </Button>
            )
          }
          columns={[
            {
              header: '#',
              render: (row) => (
                <span className="flex items-center gap-2 font-medium text-ink">
                  <ModeloVeiculoThumb base64={row.veiculoId != null ? imagensPorVeiculoId.get(row.veiculoId) : undefined} size={28} />
                  {row.id}
                </span>
              ),
            },
            {
              header: 'Cliente',
              render: (row) => (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {`${row.clienteNome ?? ''} — ${row.veiculoPlaca ?? ''}`}
                  {orcamentoSemCadastro(row) && <Badge tone="warning">Sem cadastro</Badge>}
                </span>
              ),
            },
            { header: 'Valor', render: (row) => formatCurrency(row.valorTotal) },
            { header: 'Criado em', render: (row) => formatDate(row.createdAt), hideBelow: 'sm' },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(orcamentoStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            {
              header: '',
              render: (row) => (
                // Ordem: decisão principal (Aprovar/Rejeitar) primeiro, depois
                // ações secundárias (Enviar/Reenviar/Remover/Converter), PDF
                // sempre por último — é a ação menos frequente do grupo, não
                // faz sentido competir com o "próximo passo" pela atenção.
                <div className="flex items-center justify-end gap-1.5">
                  {row.status === 'RASCUNHO' && (
                    <>
                      <IconActionButton
                        icon={CheckCircle}
                        label="Aprovar (cliente no balcão)"
                        tone="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAprovarNoBalcao(row);
                        }}
                      />
                      <IconActionButton
                        icon={ChatCircle}
                        label="Enviar para aprovação (WhatsApp)"
                        tone="brand"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnviarECompartilhar(row);
                        }}
                      />
                      <IconActionButton
                        icon={Trash}
                        label="Remover"
                        tone="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(row);
                        }}
                      />
                    </>
                  )}
                  {row.status === 'ENVIADO' && (
                    <>
                      <IconActionButton
                        icon={CheckCircle}
                        label="Aprovar"
                        tone="success"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await aprovar.mutateAsync(row.id!);
                            toast.success('Orçamento aprovado.');
                          } catch (error) {
                            toast.error(extractErrorMessage(error));
                          }
                        }}
                      />
                      <IconActionButton
                        icon={XCircle}
                        label="Rejeitar"
                        tone="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejeitando(row);
                        }}
                      />
                      <IconActionButton
                        icon={ChatCircle}
                        label="Reenviar link via WhatsApp"
                        tone="brand"
                        onClick={(e) => {
                          e.stopPropagation();
                          compartilharWhatsApp(row);
                        }}
                      />
                    </>
                  )}
                  {row.status === 'APROVADO' && (
                    <IconActionButton
                      icon={Wrench}
                      label="Converter em Ordem de Serviço"
                      tone="brand"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConverter(row);
                      }}
                    />
                  )}
                  <IconActionButton
                    icon={FileArrowDown}
                    label="PDF"
                    tone="brand"
                    onClick={(e) => {
                      e.stopPropagation();
                      baixarPdf(row);
                    }}
                  />
                </div>
              ),
            },
          ]}
          onRowClick={(row) => navigate(`/orcamentos/${row.id}`)}
        />
        {todos && <Pagination page={paginaAtual} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />}
      </Card>

      <ConfirmDialog
        open={!!rejeitando}
        title="Rejeitar orçamento"
        description={`Rejeitar o orçamento #${ultimoRejeitado.current?.id}? Ele não poderá mais ser aprovado.`}
        confirmLabel="Rejeitar"
        variant="danger"
        loading={rejeitar.isPending}
        onConfirm={confirmarRejeicao}
        onCancel={() => setRejeitando(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Remover orçamento"
        description={`Tem certeza que deseja remover o orçamento #${deleting?.id}?`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
