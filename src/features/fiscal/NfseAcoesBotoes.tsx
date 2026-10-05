import { useState } from 'react';
import { Ban, FileCode2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { PERMISSAO_FISCAL_CANCELAR, PERMISSAO_FISCAL_EMITIR } from '@/hooks/useFiscal';
import type { NfseResponse } from '@/api/types';
import { CancelarNfseModal } from './CancelarNfseModal';
import { useNfseAcoes } from './useNfseAcoes';
import type { Alerta } from './useAlerta';

// Estados em que ainda vale perguntar ao governo: o resultado é desconhecido
// (PROCESSANDO/PENDENTE) ou pode ter mudado fora do sistema (AUTORIZADA). Nos
// demais o backend responde 422 "já está em estado final".
const STATUS_ATUALIZAVEIS = ['PENDENTE', 'PROCESSANDO', 'AUTORIZADA'];

/** Atualizar status / Baixar XML / Cancelar de uma nota, cada um só quando a regra e a permissão permitem. */
export function NfseAcoesBotoes({ nota, mostrar }: { nota: NfseResponse; mostrar: (alerta: Alerta) => void }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { atualizar, baixarXml, atualizando, baixando } = useNfseAcoes(mostrar);
  const [cancelando, setCancelando] = useState<NfseResponse | null>(null);

  const id = nota.id;
  if (id == null) return null;

  const podeEmitir = hasPermission(PERMISSAO_FISCAL_EMITIR);
  const podeAtualizar = podeEmitir && !!nota.status && STATUS_ATUALIZAVEIS.includes(nota.status);
  const podeBaixar = podeEmitir && !!nota.possuiXml;
  const podeCancelar = hasPermission(PERMISSAO_FISCAL_CANCELAR) && nota.status === 'AUTORIZADA';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {podeAtualizar && (
          <Button variant="secondary" size="sm" onClick={() => atualizar(id)} loading={atualizando}>
            <RefreshCw size={16} /> Atualizar status
          </Button>
        )}
        {podeBaixar && (
          <Button variant="secondary" size="sm" onClick={() => baixarXml(id)} loading={baixando}>
            <FileCode2 size={16} /> Baixar XML
          </Button>
        )}
        {podeCancelar && (
          <Button variant="danger" size="sm" onClick={() => setCancelando(nota)}>
            <Ban size={16} /> Cancelar nota
          </Button>
        )}
      </div>
      <CancelarNfseModal nota={cancelando} onClose={() => setCancelando(null)} mostrar={mostrar} />
    </>
  );
}
