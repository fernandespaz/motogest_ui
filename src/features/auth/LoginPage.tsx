import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Wrench, IdCard, Lock, AlertCircle, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/api/client';
import { getLandingPath } from '@/layout/nav';
import { getLogoFixadaParaLogin, getNomeFixadoParaLogin } from '@/hooks/useOficina';
import { WorkshopIllustration } from './WorkshopIllustration';

const schema = z.object({
  identificador: z.string().min(1, 'Informe o CNPJ ou e-mail da oficina'),
  senha: z.string().min(1, 'Informe a senha'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const [searchParams] = useSearchParams();
  const sessaoExpirada = searchParams.get('sessao') === 'expirada';
  const [logoFixada] = useState(getLogoFixadaParaLogin);
  const [nomeFixado] = useState(getNomeFixadoParaLogin);

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
      const redirectTo =
        location.state?.from?.pathname ??
        getLandingPath(useAuthStore.getState().hasPermission, useAuthStore.getState().perfil);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(extractErrorMessage(error, 'CNPJ, e-mail ou senha inválidos.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center overflow-hidden p-4 sm:p-10 lg:p-24"
      style={{
        backgroundImage: 'url(/images/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'left center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <div className="flex flex-col items-center text-center lg:w-2/5 lg:items-start lg:text-left">
          {!logoFixada && (
            <div className="mb-8 flex items-center gap-2.5 text-white">
              <Wrench size={22} className="text-brand-500" />
              <span className="font-display text-lg font-bold tracking-tight">
                {nomeFixado || (
                  <>
                    MOTO<span className="text-brand-500">GEST</span>
                  </>
                )}
              </span>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="relative flex h-60 w-60 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:h-80 sm:w-80 lg:h-96 lg:w-96"
          >
            {logoFixada ? (
              <>
                <div
                  className="absolute inset-0 scale-110 rounded-full bg-contain bg-center bg-no-repeat opacity-80 blur-xl saturate-150"
                  style={{ backgroundImage: `url(${logoFixada})` }}
                  aria-hidden="true"
                />
                <img
                  src={logoFixada}
                  alt="Logo da sua oficina"
                  className="relative h-[97%] w-[97%] rounded-full object-cover drop-shadow-[0_20px_45px_rgba(0,0,0,0.6)]"
                />
              </>
            ) : (
              <WorkshopIllustration className="h-[78%] w-[78%] opacity-90" />
            )}
          </motion.div>

          <p className="mt-7 max-w-md font-display text-2xl font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-[28px]">
            Gestão simples, <span className="text-brand-500">resultados extraordinários.</span>
          </p>
        </div>

        {/* Card — vidro escuro translúcido, sem borda laranja */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-white">Acessar plataforma</h2>
            <p className="mb-7 mt-1.5 text-sm text-slate-400">Entre com sua conta da oficina para continuar.</p>

            {sessaoExpirada && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>Sua sessão expirou. Faça login novamente para continuar.</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <Input
                variant="dark"
                label="CNPJ ou e-mail"
                icon={IdCard}
                autoComplete="username"
                placeholder="00.000.000/0000-00 ou voce@oficina.com"
                error={errors.identificador?.message}
                required
                {...register('identificador')}
              />
              <Input
                variant="dark"
                label="Senha"
                icon={Lock}
                type="password"
                autoComplete="current-password"
                error={errors.senha?.message}
                required
                {...register('senha')}
              />

              {serverError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                fullWidth
                className="mt-1 bg-gradient-to-r from-brand-600 to-brand-700 shadow-md shadow-brand-600/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-600/40"
              >
                <LogIn size={18} /> Entrar
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            Ainda não tem uma oficina cadastrada?{' '}
            <Link to="/cadastro" className="font-medium text-brand-400 hover:text-brand-300 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
