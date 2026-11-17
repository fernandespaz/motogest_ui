import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/store/authStore';
import { anunciarLogout } from './sessaoEntreAbas';

/**
 * Encerra a sessão: o back-end revoga o refresh token e limpa os cookies HttpOnly (JavaScript não consegue
 * apagá-los). Se a chamada falhar (rede/sessão já inválida), o estado local é limpo do mesmo jeito.
 */
export async function encerrarSessao(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // sessão já inválida no servidor ou sem rede: o logout local abaixo é o que importa para a UI
  }
  useAuthStore.getState().logout();
  anunciarLogout(); // as outras abas deste navegador também caem (o cookie de sessão é compartilhado)
}
