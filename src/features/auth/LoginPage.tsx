import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Wrench } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/api/client';
import { getLandingPath } from '@/layout/nav';
import { WorkshopIllustration } from './WorkshopIllustration';

const schema = z.object({
  identificador: z.string().min(1, 'Informe o CNPJ ou e-mail da oficina'),
  senha: z.string().min(1, 'Informe a senha'),
});

type FormValues = z.infer<typeof schema>;

const FLOW_STEPS = ['Cliente', 'Veículo', 'Orçamento', 'OS', 'Execução', 'Entrega'];

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };

  const {
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
      const redirectTo = location.state?.from?.pathname ?? getLandingPath(useAuthStore.getState().hasPermission);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(extractErrorMessage(error, 'CNPJ, e-mail ou senha inválidos.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel — generic MotoGest identity: the tenant isn't known until the
          identificador is submitted, so this can't show oficina-specific branding
          (see redesign spec, "Tela de login" — decisão registrada). */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-graphite px-8 py-10 text-white sm:px-10 lg:flex-[1.15] lg:px-12 lg:py-12">
        <div className="relative z-10 flex items-center gap-2.5">
          <Wrench size={22} className="text-brand-500" />
          <span className="font-display text-lg font-bold tracking-tight">
            MOTO<span className="text-brand-500">GEST</span>
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-[38px]">
            Simplicidade para o usuário.
            <br />
            Profundidade na gestão.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">
            Uma plataforma para organizar clientes, veículos, ordens de serviço, estoque e financeiro da sua oficina
            em um único lugar.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-1.5 font-mono text-xs text-slate-400">
          {FLOW_STEPS.map((step, i) => (
            <span key={step} className="flex items-center gap-1.5">
              <b className="font-semibold text-white">{step}</b>
              {i < FLOW_STEPS.length - 1 && <span>›</span>}
            </span>
          ))}
        </div>

        <WorkshopIllustration className="pointer-events-none absolute -right-4 bottom-0 z-0 hidden w-[54%] max-w-[430px] opacity-95 sm:block" />
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-surface-alt px-4 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <h2 className="text-2xl font-semibold text-ink">Acessar plataforma</h2>
          <p className="mb-7 mt-1.5 text-sm text-ink-muted">Entre com sua conta da oficina para continuar.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="CNPJ ou e-mail"
              autoComplete="username"
              placeholder="00.000.000/0000-00 ou voce@oficina.com"
              error={errors.identificador?.message}
              required
              {...register('identificador')}
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
    </div>
  );
}
