import { z } from 'zod';
import type { UsuarioResponse } from '@/api/types';
import { isSenhaForte, SENHA_FRACA_MSG, SENHA_NAO_CONFERE_MSG } from '@/lib/senha';
import { colaboradorParaForm, colaboradorShape, demissaoDepoisDaAdmissao } from './colaborador';

const baseSchema = {
  nome: z.string().min(1, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  perfilId: z.coerce.number().positive('Selecione o perfil'),
  ativo: z.boolean().optional(),
  ...colaboradorShape,
};

// Na criação a senha é obrigatória e forte; na edição é opcional, mas quando
// preenchida segue a mesma regra e precisa bater com a confirmação.
const confirmacaoConfere = (v: { senha?: string; confirmacaoSenha?: string }) =>
  !v.senha || v.senha === v.confirmacaoSenha;

export const createSchema = z
  .object({
    ...baseSchema,
    senha: z.string().min(1, 'Informe a senha').refine(isSenhaForte, SENHA_FRACA_MSG),
    confirmacaoSenha: z.string().optional(),
  })
  .refine(confirmacaoConfere, { message: SENHA_NAO_CONFERE_MSG, path: ['confirmacaoSenha'] })
  .refine(demissaoDepoisDaAdmissao, { message: 'Anterior à admissão', path: ['dataDemissao'] });

export const editSchema = z
  .object({
    ...baseSchema,
    senha: z.string().optional().refine((v) => !v || isSenhaForte(v), SENHA_FRACA_MSG),
    confirmacaoSenha: z.string().optional(),
  })
  .refine(confirmacaoConfere, { message: SENHA_NAO_CONFERE_MSG, path: ['confirmacaoSenha'] })
  .refine(demissaoDepoisDaAdmissao, { message: 'Anterior à admissão', path: ['dataDemissao'] });

export type FormValues = z.infer<typeof createSchema>;

export function valoresIniciais(usuario?: Partial<UsuarioResponse> | null): Partial<FormValues> {
  if (!usuario) return { ativo: true, ...colaboradorParaForm() };
  return {
    nome: usuario.nome ?? '',
    email: usuario.email ?? '',
    perfilId: usuario.perfilId ?? 0,
    ativo: usuario.ativo ?? true,
    senha: '',
    confirmacaoSenha: '',
    ...colaboradorParaForm(usuario),
  };
}
