import { useContext, useEffect, type MutableRefObject } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Props {
  /** Há alterações ainda não salvas (ex.: `isDirty` do formulário). */
  ativo: boolean;
  /**
   * Marcar `true` antes de uma navegação que o próprio formulário provoca (ex.: depois de salvar com sucesso) —
   * ela não deve disparar o aviso.
   */
  permitirSaida: MutableRefObject<boolean>;
  /** O que se perde, em uma frase (ex.: "Este orçamento tem alterações que ainda não foram salvas."). */
  mensagem?: string;
}

/** Fechar/recarregar a aba com alterações pendentes: o navegador mostra o aviso dele. */
function AvisoAoFecharAba({ ativo, permitirSaida }: Pick<Props, 'ativo' | 'permitirSaida'>) {
  useEffect(() => {
    if (!ativo) return;
    const aviso = (e: BeforeUnloadEvent) => {
      if (permitirSaida.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [ativo, permitirSaida]);
  return null;
}

/** Navegar para outra tela dentro do app (menu, voltar, links) com alterações pendentes. */
function BloqueioDeNavegacao({ ativo, permitirSaida, mensagem }: Props) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      ativo && !permitirSaida.current && currentLocation.pathname !== nextLocation.pathname,
  );
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Sair sem salvar?"
      description={`${mensagem ?? 'Há alterações que ainda não foram salvas.'} Se sair agora, elas serão perdidas.`}
      confirmLabel="Sair sem salvar"
      cancelLabel="Continuar editando"
      variant="danger"
      onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
    />
  );
}

/**
 * Evita perder trabalho: avisa ao sair do formulário com alterações não salvas, tanto navegando no app quanto
 * fechando/recarregando a aba. O bloqueio de navegação só existe em router de dados (o app usa
 * `createBrowserRouter`); fora dele (testes com MemoryRouter) fica só o aviso de fechar a aba.
 */
export function AvisoAlteracoesNaoSalvas(props: Props) {
  const roteadorDeDados = useContext(UNSAFE_DataRouterContext);
  return (
    <>
      <AvisoAoFecharAba ativo={props.ativo} permitirSaida={props.permitirSaida} />
      {roteadorDeDados && <BloqueioDeNavegacao {...props} />}
    </>
  );
}
