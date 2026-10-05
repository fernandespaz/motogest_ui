import { useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  PERMISSAO_FISCAL_CERTIFICADO,
  PERMISSAO_FISCAL_CONFIGURAR,
  useCertificadoFiscal,
  useConfiguracaoFiscal,
} from '@/hooks/useFiscal';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/formatters';
import { CertificadoCard } from './CertificadoCard';
import { DadosFiscaisCard } from './DadosFiscaisCard';
import { HabilitacaoCard } from './HabilitacaoCard';
import { useErroComoAlerta } from './useErroComoAlerta';
import { useAlerta, type Alerta } from './useAlerta';

const CHAVE_PRE_REQUISITOS = 'motogest:fiscal:pre-requisitos-vistos';

const PRE_REQUISITOS: Alerta = {
  tone: 'info',
  title: 'Antes de emitir NFS-e',
  message:
    'Para emitir, a oficina precisa estar habilitada para emitir NFS-e no padrão nacional junto à Prefeitura ' +
    '(no DF, à Secretaria de Economia) e ter um certificado digital A1 válido. O sistema não faz esse credenciamento.',
};

function jaViuPreRequisitos(): boolean {
  try {
    return localStorage.getItem(CHAVE_PRE_REQUISITOS) === '1';
  } catch {
    return true; // sem storage não dá pra lembrar: não insiste a cada visita.
  }
}

function marcarPreRequisitosVistos() {
  try {
    localStorage.setItem(CHAVE_PRE_REQUISITOS, '1');
  } catch {
    // preferência de conveniência — ignorar falha de storage
  }
}

export function ConfiguracaoFiscalTab() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const podeConfigurar = hasPermission(PERMISSAO_FISCAL_CONFIGURAR);
  const podeCertificado = hasPermission(PERMISSAO_FISCAL_CERTIFICADO);
  const { data: config, isLoading, isError, error } = useConfiguracaoFiscal();
  const { data: certificado, status: statusCertificado, fetchStatus: fetchCertificado } = useCertificadoFiscal();
  const { mostrar, dialogo } = useAlerta();
  const avisado = useRef(false);

  useErroComoAlerta(isError, error, 'Não foi possível carregar a configuração fiscal', mostrar);

  // Avisos de atenção ao abrir a tela (uma vez por visita), sempre em diálogo.
  useEffect(() => {
    // O certificado vem de outra consulta: espera ela concluir (ou nem existir, por permissão)
    // antes de decidir os avisos, senão um certificado vencido passaria batido.
    const certificadoResolvido = statusCertificado !== 'pending' || fetchCertificado === 'idle';
    if (avisado.current || !config || !certificadoResolvido) return;
    avisado.current = true;
    const avisos: string[] = [];
    if (config.provedorDisponivel === false) avisos.push('Emissão de NFS-e indisponível neste ambiente.');
    if (certificado?.situacao === 'VENCIDO') {
      avisos.push(`O certificado digital venceu em ${formatDate(certificado.validoAte)}. A emissão está bloqueada até enviar outro.`);
    } else if (certificado?.situacao === 'VENCE_EM_BREVE') {
      avisos.push(`O certificado digital vence em ${certificado.diasParaVencer} dia(s) (${formatDate(certificado.validoAte)}). Providencie a renovação.`);
    }
    if (avisos.length > 0) {
      mostrar({ tone: 'warning', title: 'Atenção', detalhes: avisos });
    } else if (!jaViuPreRequisitos()) {
      marcarPreRequisitosVistos();
      mostrar(PRE_REQUISITOS);
    }
  }, [config, certificado, statusCertificado, fetchCertificado, mostrar]);

  if (isLoading) return <PageSpinner label="Carregando configuração fiscal..." />;
  if (!config) return <>{dialogo}</>;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => mostrar(PRE_REQUISITOS)}>
          <Info size={16} /> Pré-requisitos
        </Button>
      </div>
      <DadosFiscaisCard config={config} podeEditar={podeConfigurar} mostrar={mostrar} />
      <CertificadoCard podeEditar={podeCertificado} mostrar={mostrar} />
      <HabilitacaoCard config={config} podeEditar={podeConfigurar} mostrar={mostrar} />
      {dialogo}
    </div>
  );
}
