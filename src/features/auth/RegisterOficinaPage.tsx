import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { oficinasApi } from '@/api/endpoints/oficinas';
import { extractErrorMessage } from '@/api/client';
import { onlyDigits, formatCnpj } from '@/lib/formatters';

const schema = z.object({
  razaoSocial: z.string().min(1, 'Informe a razão social'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().transform(onlyDigits).refine((v) => v.length === 14, 'CNPJ deve ter 14 dígitos'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  cep: z.string().optional(),
  adminNome: z.string().min(1, 'Informe o nome do administrador'),
  adminEmail: z.string().email('E-mail inválido'),
  adminSenha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export function RegisterOficinaPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      await oficinasApi.registrar(values);
      setDone(true);
    } catch (error) {
      setServerError(extractErrorMessage(error, 'Não foi possível concluir o cadastro.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card"
        >
          <CheckCircle2 className="mx-auto mb-3 text-success" size={40} />
          <h1 className="text-lg font-semibold text-ink">Oficina cadastrada com sucesso!</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Você já pode entrar usando o CNPJ e o e-mail do administrador informados.
          </p>
          <Button className="mt-6" fullWidth onClick={() => navigate('/login')}>
            Ir para o login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8"
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-ink">Cadastre sua oficina</h1>
          <p className="mt-1 text-sm text-ink-muted">7 dias grátis para experimentar o MotoGest</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Razão social" required error={errors.razaoSocial?.message} {...register('razaoSocial')} />
            <Input label="Nome fantasia" {...register('nomeFantasia')} />
            <Controller
              control={control}
              name="cnpj"
              render={({ field }) => (
                <Input
                  label="CNPJ"
                  required
                  inputMode="numeric"
                  value={formatCnpj(field.value ?? '')}
                  onChange={(e) => field.onChange(onlyDigits(e.target.value))}
                  error={errors.cnpj?.message}
                />
              )}
            />
            <Input label="E-mail da oficina" type="email" required error={errors.email?.message} {...register('email')} />
            <Input label="Telefone" {...register('telefone')} />
            <Input label="CEP" {...register('cep')} />
            <Input label="Logradouro" {...register('logradouro')} />
            <Input label="Número" {...register('numero')} />
            <Input label="Bairro" {...register('bairro')} />
            <Input label="Cidade" {...register('cidade')} />
            <Input label="UF" maxLength={2} {...register('uf')} />
          </div>

          <div className="mt-2 border-t border-border pt-4">
            <p className="mb-3 text-sm font-semibold text-ink">Usuário administrador</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nome" required error={errors.adminNome?.message} {...register('adminNome')} />
              <Input
                label="E-mail de acesso"
                type="email"
                required
                error={errors.adminEmail?.message}
                {...register('adminEmail')}
              />
              <Input
                label="Senha"
                type="password"
                required
                error={errors.adminSenha?.message}
                hint="Mínimo de 6 caracteres"
                {...register('adminSenha')}
              />
            </div>
          </div>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{serverError}</p>
          )}

          <Button type="submit" size="lg" loading={submitting} fullWidth className="mt-2">
            Cadastrar oficina
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
