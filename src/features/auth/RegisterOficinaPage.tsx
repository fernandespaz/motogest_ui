import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

const CONTATO_EMAIL = 'contato@motogest.com.br';

/**
 * O cadastro de oficina deixou de ser self-service: o backend hoje só cria
 * oficinas via /api/v1/admin/oficinas (X-Admin-Token, uso interno do root —
 * ver features/root/RootConsolePage.tsx). Esta tela pública vira apenas um
 * convite de contato, sem submeter nada — não existe endpoint de "solicitação
 * de acesso" ainda; quando houver, este formulário volta a ser interativo.
 */
export function RegisterOficinaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card"
      >
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
          MG
        </div>
        <h1 className="text-xl font-semibold text-ink">Quer usar o MotoGest na sua oficina?</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Hoje o cadastro de novas oficinas é feito diretamente pelo nosso time. Fale com a gente e ativamos seu
          acesso.
        </p>

        <a
          href={`mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent('Quero usar o MotoGest')}`}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-base font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Mail size={18} /> Falar com o time MotoGest
        </a>

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
