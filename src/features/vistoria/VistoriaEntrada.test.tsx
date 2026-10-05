import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import type { AvariaForm } from './avarias';
import { VistoriaEntrada } from './VistoriaEntrada';

const viewer = vi.hoisted(() => ({ falhar: false }));

// O viewer entra por lazy(): na suíte inteira (centenas de arquivos em paralelo) o import do mock pode passar de 1s.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 15000 });

// WebGL não existe no jsdom: o viewer real é coberto na verificação manual no
// navegador; aqui o stub só reproduz o contrato (toque no modelo, pino clicado).
vi.mock('./VistoriaViewer', () => ({
  default: (props: {
    carroceria: string;
    pins: { indice: number }[];
    somenteLeitura?: boolean;
    onToque: (t: unknown) => void;
    onSelecionar: (i: number) => void;
  }) => {
    if (viewer.falhar) throw new Error('sem WebGL');
    return (
      <div data-testid="viewer" data-carroceria={props.carroceria} data-readonly={String(!!props.somenteLeitura)}>
        <button
          type="button"
          onClick={() => props.onToque({ ponto: { x: 0.77, y: 0.6, z: 0.17 }, normal: { x: 1, y: 0, z: 0 } })}
        >
          tocar na porta
        </button>
        {props.pins.map((p) => (
          <button key={p.indice} type="button" onClick={() => props.onSelecionar(p.indice)}>
            pino {p.indice + 1}
          </button>
        ))}
      </div>
    );
  },
}));

let valoresAtuais: { avarias: AvariaForm[]; nivelCombustivel?: number } = { avarias: [] };

function Harness({
  avarias = [],
  veiculo,
  readOnly,
}: {
  avarias?: AvariaForm[];
  veiculo?: { id?: number; marca?: string; modelo?: string };
  readOnly?: boolean;
}) {
  const methods = useForm({ defaultValues: { avarias, nivelCombustivel: 50 } });
  valoresAtuais = methods.watch() as typeof valoresAtuais;
  return (
    <FormProvider {...methods}>
      <VistoriaEntrada veiculo={veiculo} readOnly={readOnly} />
    </FormProvider>
  );
}

const avariaExemplo = (n: number): AvariaForm => ({ zona: 'TETO', tipo: 'ARRANHAO', descricao: `d${n}` });

describe('VistoriaEntrada', () => {
  it('toque no modelo cria a avaria com a região sugerida, a vista e a posição 3D', async () => {
    const user = userEvent.setup();
    render(<Harness veiculo={{ id: 1, marca: 'Toyota', modelo: 'Corolla' }} />);
    expect(screen.getByText(/Nenhuma avaria registrada/)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'tocar na porta' }));

    expect(screen.getByLabelText('Região da avaria 1')).toHaveValue('PORTA_DIANTEIRA_ESQ');
    expect(screen.getByLabelText('Tipo da avaria 1')).toHaveValue('ARRANHAO');
    expect(valoresAtuais.avarias[0]).toMatchObject({
      zona: 'PORTA_DIANTEIRA_ESQ',
      vista: 'ESQ',
      posicao: { x: 0.77, y: 0.6, z: 0.17 },
    });
  });

  it('permite corrigir região, tipo e detalhes depois de marcar', async () => {
    const user = userEvent.setup();
    render(<Harness veiculo={{ id: 1 }} />);
    await user.click(await screen.findByRole('button', { name: 'tocar na porta' }));

    await user.selectOptions(screen.getByLabelText('Região da avaria 1'), 'PORTA_TRASEIRA_ESQ');
    await user.selectOptions(screen.getByLabelText('Tipo da avaria 1'), 'AMASSADO');
    await user.type(screen.getByLabelText('Detalhes da avaria 1'), 'amassado fundo');

    expect(valoresAtuais.avarias[0]).toMatchObject({
      zona: 'PORTA_TRASEIRA_ESQ',
      tipo: 'AMASSADO',
      descricao: 'amassado fundo',
    });
  });

  it('"Adicionar manual" registra sem posição 3D', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Adicionar manual/ }));
    expect(screen.getByLabelText('Região da avaria 1')).toHaveValue('OUTRA');
    expect(valoresAtuais.avarias[0].posicao).toBeUndefined();
  });

  it('remove a avaria escolhida e renumera as outras', async () => {
    const user = userEvent.setup();
    render(<Harness avarias={[avariaExemplo(1), avariaExemplo(2), avariaExemplo(3)]} />);
    await user.click(screen.getByRole('button', { name: 'Remover avaria 2' }));
    expect(screen.getAllByLabelText(/^Região da avaria/)).toHaveLength(2);
    expect(screen.getByLabelText('Detalhes da avaria 2')).toHaveValue('d3');
  });

  it('mantém o destaque na mesma avaria depois de remover uma anterior', async () => {
    const user = userEvent.setup();
    render(<Harness avarias={[avariaExemplo(1), avariaExemplo(2), avariaExemplo(3)]} />);
    await user.click(screen.getByRole('button', { name: 'Destacar avaria 3 no modelo' }));
    expect(screen.getByRole('button', { name: 'Destacar avaria 3 no modelo' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Remover avaria 1' }));

    // A avaria destacada (d3) agora é a 2ª; o destaque acompanha ela, não o índice antigo.
    expect(screen.getByLabelText('Detalhes da avaria 2')).toHaveValue('d3');
    expect(screen.getByRole('button', { name: 'Destacar avaria 2 no modelo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Destacar avaria 1 no modelo' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('só avarias com posição viram pino no modelo', async () => {
    render(
      <Harness
        avarias={[
          { zona: 'TETO', tipo: 'ARRANHAO', posicao: { x: 0, y: 1.2, z: 0 } },
          { zona: 'INTERIOR', tipo: 'OUTRO' },
        ]}
      />,
    );
    expect(await screen.findByRole('button', { name: 'pino 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'pino 2' })).not.toBeInTheDocument();
  });

  it('em modo leitura não permite marcar, adicionar, editar nem remover', async () => {
    render(<Harness readOnly avarias={[avariaExemplo(1)]} />);
    expect(screen.queryByRole('button', { name: /Adicionar manual/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover avaria 1' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Região da avaria 1')).toBeDisabled();
    expect(screen.getByLabelText('Tipo da avaria 1')).toBeDisabled();
    expect(screen.getByLabelText('Detalhes da avaria 1')).toBeDisabled();
    expect(await screen.findByTestId('viewer')).toHaveAttribute('data-readonly', 'true');
  });

  it('bloqueia novas marcações ao chegar no limite de 50 do backend', async () => {
    render(<Harness avarias={Array.from({ length: 50 }, (_, i) => avariaExemplo(i))} />);
    expect(screen.getByText(/Limite de 50 avarias/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar manual/ })).toBeDisabled();
    expect(await screen.findByTestId('viewer')).toHaveAttribute('data-readonly', 'true');
  });

  describe('carroceria', () => {
    it('é inferida pelo modelo do veículo e pode ser trocada à mão', async () => {
      const user = userEvent.setup();
      render(<Harness veiculo={{ id: 1, marca: 'Toyota', modelo: 'Hilux' }} />);
      const grupo = screen.getByRole('radiogroup', { name: 'Carroceria do veículo' });
      expect(within(grupo).getByRole('radio', { name: 'Picape' })).toHaveAttribute('aria-checked', 'true');
      expect(await screen.findByTestId('viewer')).toHaveAttribute('data-carroceria', 'PICAPE');

      await user.click(within(grupo).getByRole('radio', { name: 'SUV' }));
      await waitFor(() => expect(screen.getByTestId('viewer')).toHaveAttribute('data-carroceria', 'SUV'));
    });

    it('a escolha manual não vaza pro próximo veículo', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Harness veiculo={{ id: 1, marca: 'Toyota', modelo: 'Corolla' }} />);
      await user.click(screen.getByRole('radio', { name: 'SUV' }));
      expect(screen.getByRole('radio', { name: 'SUV' })).toHaveAttribute('aria-checked', 'true');

      rerender(<Harness veiculo={{ id: 2, marca: 'Fiat', modelo: 'Strada' }} />);
      expect(screen.getByRole('radio', { name: 'Picape' })).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('se o 3D falhar (sem WebGL), mostra aviso e mantém a lista utilizável', async () => {
    viewer.falhar = true;
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {});
    // O jsdom reimprime erro não tratado do render no stderr; aqui a falha é a própria condição testada.
    const silenciar = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener('error', silenciar);
    try {
      const user = userEvent.setup();
      render(<Harness />);
      expect(await screen.findByText(/Não foi possível exibir o modelo 3D/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Adicionar manual/ }));
      expect(screen.getByLabelText('Região da avaria 1')).toBeInTheDocument();
    } finally {
      viewer.falhar = false;
      window.removeEventListener('error', silenciar);
      consoleErro.mockRestore();
    }
  });
});
