import { FormProvider, useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VeiculosEditor } from './VeiculosEditor';

// A consulta de verdade cobra da carteira da oficina: aqui ela é simulada.
const DADOS = { placa: 'ABC1D23', marca: 'HONDA', modelo: 'CG 160 TITAN', anoFabricacao: 2019, anoModelo: 2020, cor: 'PRETA', chassi: '9C2KC1670KR000001' };

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
    buscar: () => onDados({ ...DADOS, placa: (placa ?? '').toUpperCase() }),
    buscarChassi: vi.fn(),
    reset: vi.fn(),
  }),
}));
vi.mock('@/features/shared/ModeloVeiculoField', () => ({ ModeloVeiculoField: () => null }));

let valores: { veiculosNovos?: Record<string, unknown>[] } = {};

function Harness() {
  const methods = useForm({ defaultValues: { veiculosNovos: [] as unknown[] } });
  valores = methods.watch() as typeof valores;
  return (
    <MemoryRouter>
      <FormProvider {...methods}>
        <VeiculosEditor name="veiculosNovos" />
      </FormProvider>
    </MemoryRouter>
  );
}

describe('VeiculosEditor — veículo novo no cadastro de cliente', () => {
  it('cada veículo novo tem placa em destaque com a consulta automática e os campos completos', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /Adicionar veículo/ }));

    expect(screen.getByRole('button', { name: 'Consultar placa' })).toBeInTheDocument();
    for (const rotulo of [/^Marca/, /^Modelo/, /^Cor/, /^Chassi/, /^Ano de fabricação/, /^Categoria/, /^KM atual/]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
  });

  it('a consulta preenche só o veículo em que foi pedida e mostra a origem dos dados', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /Adicionar veículo/ }));
    await userEvent.click(screen.getByRole('button', { name: /Adicionar veículo/ }));
    const placas = screen.getAllByLabelText('Placa');
    expect(placas).toHaveLength(2);
    expect(new Set(placas.map((p) => p.id)).size).toBe(2); // ids distintos: um por veículo

    await userEvent.type(placas[1], 'abc1d23');
    await userEvent.click(screen.getAllByRole('button', { name: 'Consultar placa' })[1]);

    await waitFor(() => expect(valores.veiculosNovos?.[1]).toMatchObject({ marca: 'HONDA', modelo: 'CG 160 TITAN', cor: 'PRETA', anoFabricacao: 2019 }));
    expect(valores.veiculosNovos?.[0]?.marca ?? '').toBe('');
    expect(await screen.findByText('Informações encontradas na consulta da placa')).toBeInTheDocument();
  });
});
