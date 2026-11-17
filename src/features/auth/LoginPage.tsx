import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Wrench, IdCard, Lock, AlertCircle, AlertTriangle, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/api/client';
import { getLandingPath } from '@/layout/nav';
import { anunciarLogin } from '@/lib/sessaoEntreAbas';
import { getLogoFixadaParaLogin, getNomeFixadoParaLogin } from '@/hooks/useOficina';
import {
  lerLoginLembrado,
  limparLoginLembrado,
  opcoesDeOficinaDoErro,
  salvarLoginLembrado,
  type OpcaoOficina,
} from '@/lib/loginOficina';
import { WorkshopIllustration } from './WorkshopIllustration';

const schema = z.object({
  // código de acesso (ou CNPJ) da oficina; em branco, o login por e-mail descobre a oficina pela senha
  oficina: z.string().optional(),
  identificador: z.string().min(1, 'Informe o código do usuário ou o e-mail'),
  senha: z.string().min(1, 'Informe a senha'),
  lembrar: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const MENSAGENS_SESSAO: Record<string, string> = {
  expirada: 'Sua sessão expirou. Faça login novamente para continuar.',
  'outra-aba': 'Sua sessão foi encerrada porque você entrou novamente em outra aba. Faça login para continuar aqui.',
  encerrada: 'Você saiu em outra aba. Faça login novamente para continuar.',
};

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [opcoesOficina, setOpcoesOficina] = useState<OpcaoOficina[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const [searchParams] = useSearchParams();
  const motivoSessao = searchParams.get('sessao');
  const avisoSessao = MENSAGENS_SESSAO[motivoSessao ?? ''] ?? null;
  const [logoFixada] = useState(getLogoFixadaParaLogin);
  const [nomeFixado] = useState(getNomeFixadoParaLogin);

  // O link de acesso da oficina (/login?oficina=RAMTEC) tem prioridade sobre o que o navegador lembrou.
  const [lembrado] = useState(lerLoginLembrado);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      oficina: searchParams.get('oficina')?.toUpperCase() ?? lembrado?.oficina ?? '',
      identificador: lembrado?.usuario ?? '',
      lembrar: lembrado !== null,
    },
  });

  async function entrar(values: FormValues, oficinaEscolhida?: string) {
    setServerError(null);
    setOpcoesOficina(null);
    setSubmitting(true);
    const oficina = (oficinaEscolhida ?? values.oficina ?? '').trim();
    try {
      const response = await authApi.login({
        identificador: values.identificador.trim(),
        senha: values.senha,
        ...(oficina ? { oficina } : {}),
      });
      login(response);
      // sessão única: as outras abas deste navegador (cookie compartilhado) caem, a mais nova vence
      anunciarLogin(useAuthStore.getState().loginEm ?? Date.now());
      if (values.lembrar) {
        // só oficina e usuário (nunca a senha — ver lib/loginOficina); o que o servidor confirmou vale mais que o digitado
        salvarLoginLembrado({
          oficina: response.oficinaCodigo ?? oficina,
          usuario: response.usuarioCodigo ?? values.identificador.trim(),
        });
      } else {
        limparLoginLembrado();
      }
      const redirectTo =
        location.state?.from?.pathname ??
        getLandingPath(useAuthStore.getState().hasPermission, useAuthStore.getState().perfil);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const opcoes = opcoesDeOficinaDoErro(error);
      if (opcoes) {
        setOpcoesOficina(opcoes);
      } else {
        setServerError(extractErrorMessage(error, 'Oficina, usuário ou senha inválidos.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const onSubmit = (values: FormValues) => entrar(values);

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
                    MOTOR<span className="text-brand-500">GEST</span>
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

            {avisoSessao && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{avisoSessao}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <Input
                variant="dark"
                label="Oficina"
                icon={Building2}
                autoComplete="organization"
                autoCapitalize="characters"
                placeholder="Código da oficina (ex.: RAMTEC)"
                hint="Em branco, entramos pelo seu e-mail."
                error={errors.oficina?.message}
                {...register('oficina')}
              />
              <Input
                variant="dark"
                label="Usuário"
                icon={IdCard}
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Código (0001) ou e-mail"
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

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-transparent accent-brand-600"
                  {...register('lembrar')}
                />
                Lembrar oficina e usuário neste dispositivo
              </label>

              {opcoesOficina && (
                <div role="group" aria-label="Escolha a oficina" className="rounded-lg border border-white/15 bg-white/[0.04] p-3">
                  <p className="mb-2 text-sm font-medium text-slate-200">Em qual oficina deseja entrar?</p>
                  <div className="flex flex-col gap-2">
                    {opcoesOficina.map((o) => (
                      <button
                        key={o.codigo}
                        type="button"
                        disabled={submitting}
                        onClick={() => void entrar(getValues(), o.codigo)}
                        className="flex items-center justify-between rounded-lg border border-white/15 px-3 py-2 text-left text-sm text-white transition hover:border-brand-500 hover:bg-white/[0.06] disabled:opacity-60"
                      >
                        <span className="font-medium">{o.nome}</span>
                        <span className="text-xs text-slate-400">{o.codigo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
