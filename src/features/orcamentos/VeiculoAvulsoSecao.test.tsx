import { FormProvider, useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VeiculoAvulsoSecao } from './VeiculoAvulsoSecao';

// A consulta de verdade cobra da carteira da oficina: aqui ela é simulada, devolvendo sempre os mesmos dados.
const DADOS = {
  placa: 'ABC1D23',
  marca: 'HONDA',
  modelo: 'CG 160 TITAN',
  anoFabricacao: 2019,
  anoModelo: 2020,
  cor: 'PRETA',
  chassi: '9C2KC1670KR000001',
};

vi.mock('@/features/shared/usePlacaConsulta', () => ({
  usePlacaConsulta: (placa: string | undefined, onDados: (d: typeof DADOS) => void) => ({
    disponivel: true,
    carteira: { precoConsultaCentavos: 10, precoChassiCentavos: 25, estado: 'OK', saldoCentavos: 5000 },
    podeRecarregar: false,
    valida: true,
    normalizada: (placa ?? '').toUpperCase(),
    resultado: undefined,
    totalCobradoCentavos: 0,
    esgotado: false,
    buscando: false,
    buscandoChassi: false,
    ocupado: false,
    buscar: () => onDados(DADOS),
    buscarChassi: vi.fn(),
    reset: vi.fn(),
  }),
}));
vi.mock('@/features/shared/ModeloVeiculoField', () => ({ ModeloVeiculoField: () => null }));

let valores: Record<string, unknown> = {};

function Harness({ inicial = {} }: { inicial?: Record<string, unknown> }) {
  const methods = useForm({ defaultValues: { veiculoPlaca: 'ABC1D23', veiculoCategoria: '', ...inicial } });
  valores = methods.watch();
  return (
    <MemoryRouter>
      <FormProvider {...methods}>
        <VeiculoAvulsoSecao />
      </FormProvider>
    </MemoryRouter>
  );
}

describe('VeiculoAvulsoSecao — mesma experiência do cadastro de veículo', () => {
  it('abre com a placa em destaque e os campos do veículo, sem o KM (o rascunho não guarda)', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Consultar placa' })).toBeInTheDocument();
    for (const rotulo of [/^Marca/, /^Modelo/, /^Cor/, /^Chassi/, /^Ano de fabricação/, /^Ano do modelo/, /^Categoria/]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText(/KM atual/)).not.toBeInTheDocument();
  });

  it('a consulta preenche os dados no formulário do orçamento e separa o que veio da consulta', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Consultar placa' }));

    expect(await screen.findByText('Informações encontradas na consulta da placa')).toBeInTheDocument();
    await waitFor(() =>
      expect(valores).toMatchObject({
        veiculoMarca: 'HONDA',
        veiculoModelo: 'CG 160 TITAN',
        veiculoAnoFabricacao: 2019,
        veiculoAnoModelo: 2020,
        veiculoCor: 'PRETA',
        veiculoChassi: '9C2KC1670KR000001',
      }),
    );
    expect(screen.getByLabelText('Marca')).toHaveValue('HONDA');
    // a categoria nunca vem da consulta: segue pendente para o consultor escolher
    expect(screen.getByLabelText(/Categoria/)).toHaveValue('');
  });

  it('nunca sobrescreve o que o consultor já digitou', async () => {
    render(<Harness inicial={{ veiculoModelo: 'Digitado por mim' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Consultar placa' }));

    await waitFor(() => expect(valores).toMatchObject({ veiculoMarca: 'HONDA' }));
    expect(valores.veiculoModelo).toBe('Digitado por mim');
  });
});
