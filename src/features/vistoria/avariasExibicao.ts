import type { AvariaPublicaResponse, AvariaResponse } from '@/api/types';
import type { OSDocumentAvaria } from '@/features/shared/pdf/types';
import { ROTULO_TIPO, ROTULO_ZONA } from './zonas';

/** Resposta da API (autenticada ou pública) → linhas de PDF e de tela pública, já em português. */
export function avariasParaExibicao(avarias: (AvariaResponse | AvariaPublicaResponse)[] | undefined): OSDocumentAvaria[] {
  return (avarias ?? []).flatMap((a) =>
    a.zona && a.tipo
      ? [{ regiao: ROTULO_ZONA[a.zona], tipo: ROTULO_TIPO[a.tipo], descricao: a.descricao?.trim() || undefined }]
      : [],
  );
}
