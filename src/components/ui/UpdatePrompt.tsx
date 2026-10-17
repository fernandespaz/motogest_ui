import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';

// Frequência com que uma aba aberta pergunta ao servidor se há deploy novo.
// Sem isso o navegador só checa ao navegar/abrir a página (no máximo 1x/24h).
const INTERVALO_CHECAGEM_MS = 10 * 60 * 1000;

export function UpdatePrompt() {
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => void registration.update(), INTERVALO_CHECAGEM_MS);
      // Voltar pra aba depois de horas em segundo plano: confere na hora.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
  });

  if (!precisaAtualizar) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-brand-300 bg-white px-4 py-3 shadow-card dark:bg-graphite-2 sm:left-auto sm:right-6 sm:bottom-6"
    >
      <RefreshCw size={18} className="shrink-0 text-brand-600" />
      <p className="flex-1 text-sm font-medium text-ink">Nova versão disponível.</p>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Atualizar
      </Button>
    </div>
  );
}
