import { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, RouterProvider, createMemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AvisoAlteracoesNaoSalvas } from './AvisoAlteracoesNaoSalvas';

function Formulario({ ativo }: { ativo: boolean }) {
  const saida = useRef(false);
  const navigate = useNavigate();
  return (
    <div>
      <AvisoAlteracoesNaoSalvas ativo={ativo} permitirSaida={saida} mensagem="Este orçamento tem alterações que ainda não foram salvas." />
      <Link to="/lista">Ir para a lista</Link>
      <button
        onClick={() => {
          saida.current = true; // como depois de um "salvar" com sucesso
          navigate('/lista');
        }}
      >
        Salvar e sair
      </button>
    </div>
  );
}

function renderizar(ativo: boolean) {
  const router = createMemoryRouter(
    [
      { path: '/form', element: <Formulario ativo={ativo} /> },
      { path: '/lista', element: <p>Tela da lista</p> },
    ],
    { initialEntries: ['/form'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('AvisoAlteracoesNaoSalvas', () => {
  it('com alterações pendentes, sair do formulário pede confirmação; "Continuar editando" fica na tela', async () => {
    const router = renderizar(true);
    await userEvent.click(screen.getByRole('link', { name: 'Ir para a lista' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Sair sem salvar?' });
    expect(dialogo).toHaveTextContent('Este orçamento tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.');
    expect(router.state.location.pathname).toBe('/form');

    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/form');
  });

  it('"Sair sem salvar" segue para a tela pedida', async () => {
    const router = renderizar(true);
    await userEvent.click(screen.getByRole('link', { name: 'Ir para a lista' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair sem salvar' }));

    await waitFor(() => expect(screen.getByText('Tela da lista')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/lista');
  });

  it('sem alterações, navega direto, sem aviso', async () => {
    renderizar(false);
    await userEvent.click(screen.getByRole('link', { name: 'Ir para a lista' }));

    expect(await screen.findByText('Tela da lista')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a saída que o próprio formulário provoca depois de salvar não dispara o aviso', async () => {
    renderizar(true);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar e sair' }));

    expect(await screen.findByText('Tela da lista')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fechar a aba com alterações pendentes aciona o aviso do navegador; sem alterações, não', () => {
    const { unmount } = render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <Formulario ativo /> }])} />,
    );
    const comAlteracoes = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(comAlteracoes);
    expect(comAlteracoes.defaultPrevented).toBe(true);
    unmount();

    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Formulario ativo={false} /> }])} />);
    const semAlteracoes = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(semAlteracoes);
    expect(semAlteracoes.defaultPrevented).toBe(false);
  });
});
