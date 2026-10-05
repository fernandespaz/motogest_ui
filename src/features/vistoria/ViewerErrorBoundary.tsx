import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Se o navegador não tiver WebGL (ou o .glb falhar), a vistoria continua utilizável pela lista.
 * Fica em arquivo próprio pra poder ser importado sem puxar three.js pro bundle principal. */
export class ViewerErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao exibir o modelo 3D da vistoria', error, info.componentStack);
  }
  render() {
    return this.state.erro ? this.props.fallback : this.props.children;
  }
}
