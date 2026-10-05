import { z } from 'zod';
import type { AvariaRequest, AvariaResponse, TipoAvaria, VistaAvaria, ZonaAvaria } from '@/api/types';
import { TIPOS, VISTAS, ZONAS } from './zonas';

/** Limite do backend (OrcamentoRequest.avarias.maxItems). */
export const MAX_AVARIAS = 50;
export const MAX_DESCRICAO = 300;

export const avariaSchema = z.object({
  id: z.number().optional(),
  zona: z.enum(ZONAS as [ZonaAvaria, ...ZonaAvaria[]]),
  tipo: z.enum(TIPOS as [TipoAvaria, ...TipoAvaria[]]),
  descricao: z.string().max(MAX_DESCRICAO, `Máximo de ${MAX_DESCRICAO} caracteres`).optional(),
  vista: z.enum(VISTAS as [VistaAvaria, ...VistaAvaria[]]).optional(),
  posicao: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  fotoId: z.number().optional(),
});

export type AvariaForm = z.infer<typeof avariaSchema>;

/** Resposta da API → shape do form (campos nulos viram undefined; zod não aceita null). */
export function avariasParaFormValues(avarias: AvariaResponse[] | undefined): AvariaForm[] {
  return (avarias ?? []).flatMap((a) =>
    a.zona && a.tipo
      ? [
          {
            id: a.id,
            zona: a.zona,
            tipo: a.tipo,
            descricao: a.descricao ?? undefined,
            vista: a.vista ?? undefined,
            posicao: a.posicao ?? undefined,
            fotoId: a.fotoId ?? undefined,
          },
        ]
      : [],
  );
}

/** Form → AvariaRequest. `id` e `fotoUrl` só existem na resposta; o request leva a lista completa de avarias. */
export function avariasParaPayload(avarias: AvariaForm[] | undefined): AvariaRequest[] {
  return (avarias ?? []).map((a) => ({
    zona: a.zona,
    tipo: a.tipo,
    descricao: a.descricao?.trim() || undefined,
    vista: a.vista,
    posicao: a.posicao,
    fotoId: a.fotoId,
  }));
}
