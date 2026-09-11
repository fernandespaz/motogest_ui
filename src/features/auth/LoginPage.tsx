import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/api/client';
import { onlyDigits, formatCnpj } from '@/lib/formatters';

const schema = z.object({
  cnpj: z.string().min(14, 'Informe um CNPJ válido').transform(onlyDigits),
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };

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
      const response = await authApi.login(values);
      login(response);
      const redirectTo = location.state?.from?.pathname ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(extractErrorMessage(error, 'CNPJ, e-mail ou senha inválidos.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            MG
          </div>
          <h1 className="text-xl font-semibold text-ink">Entrar no MotoGest</h1>
          <p className="mt-1 text-sm text-ink-muted">Acesse com os dados da sua oficina</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Controller
            control={control}
            name="cnpj"
            render={({ field }) => (
              <Input
                label="CNPJ da oficina"
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                autoComplete="off"
                value={formatCnpj(field.value ?? '')}
                onChange={(e) => field.onChange(onlyDigits(e.target.value))}
                error={errors.cnpj?.message}
                required
              />
            )}
          />
          <Input
            label="E-mail"
            type="email"
            autoComplete="username"
            placeholder="voce@oficina.com"
            error={errors.email?.message}
            required
            {...register('email')}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.senha?.message}
            required
            {...register('senha')}
          />

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{serverError}</p>
          )}

          <Button type="submit" size="lg" loading={submitting} fullWidth className="mt-1">
            <LogIn size={18} /> Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Ainda não tem uma oficina cadastrada?{' '}
          <Link to="/cadastro" className="font-medium text-brand-700 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
