import type { VistaAvaria } from '@/api/types';
import type { Vetor3 } from './zonas';

/**
 * O selo numerado do pino é HTML por cima do canvas e não some atrás da
 * carroceria sozinho (raycast por frame contra a malha inteira ficaria pesado
 * com até 50 pinos). Como cada avaria guarda a `vista` (lado da superfície
 * marcada), basta checar se a câmera está desse lado do carro.
 */
export function pinVisivel(camera: Vetor3, vista?: VistaAvaria): boolean {
  switch (vista) {
    case 'ESQ':
      return camera.x > 0.2;
    case 'DIR':
      return camera.x < -0.2;
    case 'FRENTE':
      return camera.z > 0.2;
    case 'TRAS':
      return camera.z < -0.2;
    case 'TOPO':
      return camera.y > 1.5;
    default:
      return true;
  }
}
