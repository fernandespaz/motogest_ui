import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LoginResponse } from '@/api/types';
import { queryClient } from '@/lib/queryClient';

interface AuthState {
  /** Marca de cada login (identifica a sessão sem expor credencial: o JWT vive só em cookie HttpOnly). */
  loginEm: number | null;
  usuarioId?: number | null;
  tenantId?: number | null;
  nome?: string;
  email?: string;
  perfil?: string;
  permissoes: string[];
  isAuthenticated: boolean;
  login: (response: LoginResponse) => void;
  logout: () => void;
  hasPermission: (codigo: string) => boolean;
}

const STORAGE_KEY = 'motogest.auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      loginEm: null,
      usuarioId: undefined,
      tenantId: undefined,
      nome: undefined,
      email: undefined,
      perfil: undefined,
      permissoes: [],
      isAuthenticated: false,

      login: (response) => {
        // Clearing every other bit of client state prevents a new tenant's session
        // from ever seeing cached data left behind by whoever was logged in before.
        useAuthStore.persist.clearStorage();
        queryClient.clear();
        set({
          loginEm: Date.now(),
          usuarioId: response.usuarioId ?? null,
          tenantId: response.tenantId ?? null,
          nome: response.nome ?? '',
          email: response.email ?? '',
          perfil: response.perfil ?? '',
          permissoes: response.permissoes ?? [],
          isAuthenticated: true,
        });
      },

      logout: () => {
        useAuthStore.persist.clearStorage();
        queryClient.clear();
        set({
          loginEm: null,
          usuarioId: undefined,
          tenantId: undefined,
          nome: undefined,
          email: undefined,
          perfil: undefined,
          permissoes: [],
          isAuthenticated: false,
        });
      },

      hasPermission: (codigo: string) => {
        const permissoes = get().permissoes ?? [];
        return permissoes.includes(codigo);
      },
    }),
    {
      name: STORAGE_KEY,
      // Só dados de exibição/permissão: o JWT e o refresh token ficam em cookies HttpOnly emitidos pelo
      // back-end (inacessíveis a JavaScript). sessionStorage limita o perfil em cache à aba.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        loginEm: state.loginEm,
        usuarioId: state.usuarioId,
        tenantId: state.tenantId,
        nome: state.nome,
        email: state.email,
        perfil: state.perfil,
        permissoes: state.permissoes,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
