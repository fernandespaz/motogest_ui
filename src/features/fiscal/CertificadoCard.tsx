import { useRef, useState } from 'react';
import { FileKey2, Trash2, Upload } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, ReadOnlyField } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import {
  useCertificadoFiscal,
  useEnviarCertificadoFiscal,
  useRemoverCertificadoFiscal,
} from '@/hooks/useFiscal';
import { formatCnpj, formatDateTime } from '@/lib/formatters';
import type { CertificadoFiscalResponse } from '@/api/types';
import { alertaDeErro } from './fiscalAlertas';
import type { Alerta } from './useAlerta';

const EXTENSOES = /\.(pfx|p12)$/i;

export const situacaoCertificado: Record<
  NonNullable<CertificadoFiscalResponse['situacao']>,
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  VALIDO: { label: 'Válido', tone: 'success' },
  VENCE_EM_BREVE: { label: 'Vence em breve', tone: 'warning' },
  VENCIDO: { label: 'Vencido', tone: 'danger' },
};

interface Props {
  podeEditar: boolean;
  mostrar: (alerta: Alerta) => void;
}

export function CertificadoCard({ podeEditar, mostrar }: Props) {
  const { data: certificado, isLoading } = useCertificadoFiscal();
  const enviar = useEnviarCertificadoFiscal();
  const remover = useRemoverCertificadoFiscal();
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  async function handleEnviar() {
    if (!arquivo) return;
    if (!EXTENSOES.test(arquivo.name)) {
      mostrar({
        tone: 'warning',
        title: 'Arquivo não aceito',
        message: 'Envie o certificado digital A1 em arquivo .pfx ou .p12.',
      });
      return;
    }
    try {
      const enviado = await enviar.mutateAsync({ arquivo, senha });
      mostrar({
        tone: 'success',
        title: 'Certificado enviado',
        message: `Certificado de ${enviado.titular ?? 'sua oficina'} validado e guardado com segurança.`,
      });
    } catch (error) {
      mostrar(alertaDeErro(error, 'Não foi possível enviar o certificado', 'Confira o arquivo e a senha.'));
    } finally {
      // A senha não deve sobreviver ao envio, deu certo ou não.
      setSenha('');
      setArquivo(null);
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  }

  async function handleRemover() {
    try {
      await remover.mutateAsync();
      mostrar({
        tone: 'info',
        title: 'Certificado removido',
        message: 'A emissão de NFS-e fica pausada até você enviar outro certificado.',
      });
    } catch (error) {
      mostrar(alertaDeErro(error, 'Não foi possível remover o certificado', 'Tente novamente em instantes.'));
    } finally {
      setConfirmandoRemocao(false);
    }
  }

  const situacao = certificado?.situacao ? situacaoCertificado[certificado.situacao] : undefined;

  return (
    <Card>
      <CardHeader
        title="2. Certificado digital"
        subtitle="Somente certificado A1 (arquivo .pfx), emitido para o CNPJ da oficina. Certificado A3 (token/cartão) não funciona."
        action={situacao && <Badge tone={situacao.tone}>{situacao.label}</Badge>}
      />
      <CardBody className="space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Spinner size={16} /> Carregando certificado...
          </div>
        ) : certificado?.enviado ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Titular" value={certificado.titular ?? '—'} />
            <ReadOnlyField label="CNPJ" value={certificado.cnpj ? formatCnpj(certificado.cnpj) : '—'} />
            <ReadOnlyField label="Válido até" value={formatDateTime(certificado.validoAte)} />
            <ReadOnlyField
              label="Dias para vencer"
              value={certificado.diasParaVencer != null ? String(certificado.diasParaVencer) : '—'}
            />
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Nenhum certificado enviado.</p>
        )}

        {podeEditar && (
          <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-medium text-ink">
              {certificado?.enviado ? 'Substituir certificado' : 'Enviar certificado'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="certificado-arquivo" className="text-sm font-medium text-ink">
                  Arquivo (.pfx / .p12)
                </label>
                <input
                  id="certificado-arquivo"
                  ref={inputArquivo}
                  type="file"
                  accept=".pfx,.p12"
                  disabled={enviar.isPending}
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-surface-alt file:px-3 file:py-2 file:text-sm file:font-medium"
                />
              </div>
              <Input
                label="Senha do certificado"
                type="password"
                autoComplete="off"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={enviar.isPending}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {certificado?.enviado && (
                <Button variant="outline" onClick={() => setConfirmandoRemocao(true)} disabled={enviar.isPending}>
                  <Trash2 size={16} /> Remover
                </Button>
              )}
              <Button onClick={handleEnviar} loading={enviar.isPending} disabled={!arquivo || senha === ''}>
                {certificado?.enviado ? <FileKey2 size={16} /> : <Upload size={16} />}
                {certificado?.enviado ? 'Substituir' : 'Enviar certificado'}
              </Button>
            </div>
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirmandoRemocao}
        title="Remover certificado?"
        description="A emissão de NFS-e para até você enviar outro certificado."
        confirmLabel="Remover"
        variant="danger"
        loading={remover.isPending}
        onConfirm={handleRemover}
        onCancel={() => setConfirmandoRemocao(false)}
      />
    </Card>
  );
}
