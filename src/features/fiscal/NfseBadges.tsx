import { FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { metaFor, nfseStatusMeta } from '@/lib/statusMeta';
import type { AmbienteFiscal } from '@/api/types';

export function NfseStatusBadge({ status }: { status?: string }) {
  const meta = metaFor(nfseStatusMeta, status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/** Selo exigido em toda nota emitida em homologação: ela não tem validade fiscal. */
export function AmbienteBadge({ ambiente }: { ambiente?: AmbienteFiscal }) {
  if (ambiente === 'HOMOLOGACAO') {
    return (
      <Badge tone="warning">
        <FlaskConical size={12} aria-hidden="true" /> TESTE — sem validade fiscal
      </Badge>
    );
  }
  if (ambiente === 'PRODUCAO') return <Badge tone="success">Produção</Badge>;
  return null;
}
