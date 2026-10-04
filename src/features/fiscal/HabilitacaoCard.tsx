import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAtualizarConfiguracaoFiscal } from '@/hooks/useFiscal';
import { useAuthStore } from '@/store/authStore';
import type { AmbienteFiscal, ConfiguracaoFiscalResponse } from '@/api/types';
import { pendenciaDaOficina, toFormValues, toRequest } from './configuracaoFiscal';
import { alertaDeErro } from './fiscalAlertas';
import type { Alerta } from './useAlerta';

interface Props {
  config: ConfiguracaoFiscalResponse;
  podeEditar: boolean;
  mostrar: (alerta: Alerta) => void;
}

export function HabilitacaoCard({ config, podeEditar, mostrar }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const atualizar = useAtualizarConfiguracaoFiscal();
  const [habilitada, setHabilitada] = useState(config.emissaoHabilitada ?? false);
  const [ambiente, setAmbiente] = useState<AmbienteFiscal>(config.ambiente ?? 'HOMOLOGACAO');
  const [confirmandoProducao, setConfirmandoProducao] = useState(false);

  const pendencias = config.pendencias ?? [];
  const semPendencias = pendencias.length === 0;
  // Só aceita ligar sem pendências (o backend recusa com 422); desligar é sempre possível.
  const podeLigar = semPendencias;
  const mudou = habilitada !== (config.emissaoHabilitada ?? false) || ambiente !== (config.ambiente ?? 'HOMOLOGACAO');
  const indoParaProducao = ambiente === 'PRODUCAO' && config.ambiente !== 'PRODUCAO';

  async function salvar() {
    try {
      await atualizar.mutateAsync(
        toRequest(toFormValues(config), {
          emissaoHabilitada: habilitada,
          ambiente,
          provedorEmpresaRef: config.provedorEmpresaRef,
        }),
      );
      mostrar({
        tone: 'success',
        title: habilitada ? 'Emissão habilitada' : 'Emissão desabilitada',
        message: habilitada
          ? `As notas serão emitidas em ${ambiente === 'PRODUCAO' ? 'PRODUÇÃO (com validade fiscal)' : 'HOMOLOGAÇÃO (apenas teste)'}.`
          : 'Nenhuma NFS-e será emitida até você habilitar novamente.',
      });
    } catch (error) {
      mostrar(alertaDeErro(error, 'Não foi possível salvar a habilitação', 'Tente novamente em instantes.'));
      // Volta o formulário ao que o servidor realmente tem.
      setHabilitada(config.emissaoHabilitada ?? false);
      setAmbiente(config.ambiente ?? 'HOMOLOGACAO');
    } finally {
      setConfirmandoProducao(false);
    }
  }

  function pedirSalvar() {
    if (indoParaProducao) setConfirmandoProducao(true);
    else void salvar();
  }

  return (
    <Card>
      <CardHeader title="3. Habilitar emissão" subtitle="Escolha o ambiente e ligue a emissão quando não houver pendências." />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            {semPendencias ? 'Tudo certo para emitir.' : 'Para emitir, falta:'}
          </p>
          <ul className="space-y-1.5">
            {semPendencias ? (
              <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 size={16} aria-hidden="true" /> Nenhuma pendência
              </li>
            ) : (
              pendencias.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-ink">
                  <Circle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                  <span>
                    {p}
                    {pendenciaDaOficina(p) && hasPermission('OFICINA_READ') && (
                      <>
                        {' '}
                        <Link to="/oficina" className="font-medium text-brand-700 hover:underline">
                          Corrigir em Minha Oficina
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Ambiente"
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value as AmbienteFiscal)}
            disabled={!podeEditar || atualizar.isPending}
            hint="Homologação é teste: a nota não tem validade fiscal."
          >
            <option value="HOMOLOGACAO">Homologação (teste)</option>
            <option value="PRODUCAO">Produção</option>
          </Select>
          <div className="flex flex-col justify-center gap-1">
            <Checkbox
              label="Habilitar emissão de NFS-e"
              checked={habilitada}
              disabled={!podeEditar || atualizar.isPending || (!habilitada && !podeLigar)}
              onChange={(e) => setHabilitada(e.target.checked)}
            />
            {!semPendencias && !habilitada && (
              <p className="text-xs text-ink-muted">Resolva as pendências para poder habilitar.</p>
            )}
          </div>
        </div>

        {podeEditar && (
          <div className="flex justify-end">
            <Button onClick={pedirSalvar} loading={atualizar.isPending} disabled={!mudou}>
              Salvar habilitação
            </Button>
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirmandoProducao}
        title="Mudar para PRODUÇÃO?"
        description="Em produção, as notas emitidas têm validade fiscal e só podem ser desfeitas por cancelamento. Confirme que os dados fiscais foram revisados pelo seu contador."
        confirmLabel="Usar produção"
        loading={atualizar.isPending}
        onConfirm={salvar}
        onCancel={() => setConfirmandoProducao(false)}
      />
    </Card>
  );
}
