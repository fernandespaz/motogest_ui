import { useEffect, useState } from 'react';
import { ShieldAlert, Plus, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { useOficinasAdmin } from '@/hooks/useOficinasAdmin';
import { NovaOficinaModal } from './NovaOficinaModal';
import type { AdminOficinaResponse } from '@/api/types';
import { formatDate } from '@/lib/formatters';
import { licencaStatusMeta, metaFor } from '@/lib/statusMeta';

const STORAGE_KEY = 'motogest_admin_token';

/**
 * Console interno do root da plataforma — não faz parte do fluxo público de
 * signup e não fica em nenhum menu do app. O X-Admin-Token nunca é embutido
 * no bundle: o root digita o próprio segredo aqui, ele fica só em memória
 * (sessionStorage desta aba) e nunca é persistido pelo authStore de tenant.
 */
export function RootConsolePage() {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? '');
  const [tokenInput, setTokenInput] = useState('');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useOficinasAdmin(adminToken, { page, size: 20 });

  useEffect(() => {
    if (!isError || !adminToken) return;
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      sessionStorage.removeItem(STORAGE_KEY);
      setAdminToken('');
    }
  }, [isError, error, adminToken]);

  function handleUnlock() {
    if (!tokenInput.trim()) return;
    sessionStorage.setItem(STORAGE_KEY, tokenInput.trim());
    setAdminToken(tokenInput.trim());
    setTokenInput('');
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAdminToken('');
  }

  if (!adminToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
        <Card className="w-full max-w-sm p-6">
          <div className="mb-4 flex flex-col items-center text-center">
            <ShieldAlert className="mb-2 text-brand-600" size={32} />
            <h1 className="text-lg font-semibold text-ink">Console do root</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Uso interno — informe o token de administrador da plataforma para continuar.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlock();
            }}
            className="flex flex-col gap-3"
          >
            <Input
              label="X-Admin-Token"
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              required
            />
            <Button type="submit" fullWidth>
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Oficinas cadastradas"
        subtitle="Único painel do sistema que enxerga todas as oficinas ao mesmo tempo"
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={18} /> Nova oficina
            </Button>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut size={16} /> Sair
            </Button>
          </div>
        }
      />

      <Card>
        <DataTable<AdminOficinaResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.tenantId!}
          emptyTitle="Nenhuma oficina cadastrada ainda"
          columns={[
            {
              header: 'Oficina',
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.nomeFantasia || row.razaoSocial}</p>
                  <p className="text-xs text-ink-muted">{row.cnpj}</p>
                </div>
              ),
            },
            { header: 'E-mail', render: (row) => row.email, hideBelow: 'sm' },
            { header: 'Plano', render: (row) => row.plano ?? '—', hideBelow: 'md' },
            {
              header: 'Licença',
              render: (row) => {
                const meta = metaFor(licencaStatusMeta, row.statusLicenca);
                return <Badge tone={row.licencaExpirada ? 'danger' : meta.tone}>{meta.label}</Badge>;
              },
            },
            { header: 'Expira em', render: (row) => formatDate(row.dataExpiracaoLicenca), hideBelow: 'lg' },
            {
              header: 'Ativa',
              render: (row) => <Badge tone={row.ativo ? 'success' : 'neutral'}>{row.ativo ? 'Sim' : 'Não'}</Badge>,
            },
          ]}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      {isError && (
        <p className="mt-4 text-sm font-medium text-danger">
          Token inválido ou sem permissão — informe o token novamente.
        </p>
      )}

      <NovaOficinaModal open={modalOpen} onClose={() => setModalOpen(false)} adminToken={adminToken} />
    </div>
  );
}
