import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'motogest.tema';

function prefereEscuro(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function aplicarTema(mode: ThemeMode) {
  const escuro = mode === 'dark' || (mode === 'system' && prefereEscuro());
  document.documentElement.classList.toggle('dark', escuro);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => {
        aplicarTema(mode);
        set({ mode });
      },
    }),
    {
      name: STORAGE_KEY,
      // O <script> inline em index.html já aplica a classe "dark" antes do
      // primeiro paint (evita o flash de tema errado) usando o mesmo valor
      // salvo aqui — isso só garante que o estado do React comece em sincronia
      // com o que já está na tela, incluindo quando o tema é "system" e a
      // preferência do SO mudou desde a última visita.
      onRehydrateStorage: () => (state) => {
        if (state) aplicarTema(state.mode);
      },
    },
  ),
);

// Preferência "Sistema" reage em tempo real se o usuário trocar o tema do SO
// com o app já aberto — sem isso, só refletiria na próxima vez que o app
// carregasse do zero.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') aplicarTema('system');
  });
}
