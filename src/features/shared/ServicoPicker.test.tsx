import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ServicoResponse } from '@/api/types';
import { ServicoPicker, agruparPorSistema, filtrarServicos, resumirSelecao } from './ServicoPicker';

const catalogo: ServicoResponse[] = [
  { id: 1, nome: 'Troca de óleo', sistema: 'Revisões', categoria: 'A', tempoMinHoras: 0.5, tempoMaxHoras: 0.5, precoMinSugerido: 225, precoMaxSugerido: 225 },
  { id: 2, nome: 'Troca pastilhas dianteiras', sistema: 'Freios', categoria: 'A', tempoMinHoras: 1, tempoMaxHoras: 1.5, precoMinSugerido: 300, precoMaxSugerido: 400 },
  { id: 3, nome: 'Troca fluido de freio', sistema: 'Freios', categoria: 'A', tempoMinHoras: 0.5, tempoMaxHoras: 0.5, precoMinSugerido: 150, precoMaxSugerido: 150 },
  { id: 4, nome: 'Diagnóstico elétrico', sistema: 'Elétrica', categoria: 'C', tempoMinHoras: 2, tempoMaxHoras: 2 },
  { id: 5, nome: 'Serviço avulso', categoria: 'B', tempoMinHoras: 1, tempoMaxHoras: 1 },
];

function Harness({ inicial = [] as number[] }) {
  const [ids, setIds] = useState<number[]>(inicial);
  return <ServicoPicker servicos={catalogo} value={ids} onChange={setIds} />;
}

describe('helpers do ServicoPicker', () => {
  it('groups by system keeping the catalog order and counting each, with "Outros" for services without one', () => {
    expect(agruparPorSistema(catalogo)).toEqual([
      { nome: 'Revisões', quantidade: 1 },
      { nome: 'Freios', quantidade: 2 },
      { nome: 'Elétrica', quantidade: 1 },
      { nome: 'Outros', quantidade: 1 },
    ]);
  });

  it('searches name and system ignoring case and accents', () => {
    expect(filtrarServicos(catalogo, 'ELETRICA', null).map((s) => s.id)).toEqual([4]);
    expect(filtrarServicos(catalogo, 'freio', null).map((s) => s.id)).toEqual([2, 3]);
    expect(filtrarServicos(catalogo, 'troca', 'Freios').map((s) => s.id)).toEqual([2, 3]);
  });

  it('sums hours and the suggested price, dropping the price when a chosen service has none', () => {
    expect(resumirSelecao([catalogo[1], catalogo[2]])).toEqual({ horasMin: 1.5, horasMax: 2, precoMin: 450, precoMax: 550 });
    expect(resumirSelecao([catalogo[1], catalogo[3]]).precoMin).toBeNull();
    expect(resumirSelecao([])).toEqual({ horasMin: 0, horasMax: 0, precoMin: 0, precoMax: 0 });
  });
});

describe('ServicoPicker', () => {
  beforeEach(() => localStorage.clear());

  it('filters by the typed term and shows a message when nothing matches', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByPlaceholderText(/Buscar serviço/), 'freio');

    expect(screen.getByRole('checkbox', { name: /pastilhas/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /óleo/ })).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Buscar serviço/), 'xyz');
    expect(screen.getByText(/Nenhum serviço encontrado/)).toBeInTheDocument();
  });

  it('narrows to a system tab and toggles it off again', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /^Elétrica/ }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /^Elétrica/ }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(catalogo.length);
  });

  it('shows the selection with totals and lets a chip remove a service', async () => {
    render(<Harness />);
    expect(screen.getByText('Nenhum serviço selecionado ainda.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /pastilhas/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /fluido de freio/ }));

    expect(screen.getByText('2 serviços')).toBeInTheDocument();
    expect(screen.getByText(/1,5–2 h estimadas/)).toBeInTheDocument();
    expect(screen.getByText(/450,00 – .*550,00 sugerido/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover Troca fluido de freio' }));
    expect(screen.getByText('1 serviço')).toBeInTheDocument();
  });

  it('only offers the vehicle’s category, and can show every category on request', async () => {
    render(<ServicoPicker servicos={catalogo} value={[]} onChange={() => {}} categoriaVeiculo="C" />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: /Diagnóstico elétrico/ })).toBeInTheDocument();
    expect(screen.getAllByText('Categoria C').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Ver todas as categorias' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(catalogo.length);
  });

  it('shows a prompt instead of the list while there is no vehicle', () => {
    render(<ServicoPicker servicos={catalogo} value={[]} onChange={() => {}} aguardandoVeiculo />);
    expect(screen.getByText('Escolha o veículo para ver os serviços')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('lists services as rows with column headers by default, and remembers the cards view once chosen', async () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByText('Valor sugerido')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ver em lista' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('radio', { name: 'Ver em cards' }));
    expect(screen.queryByText('Valor sugerido')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(catalogo.length);
    unmount();

    render(<Harness />);
    expect(screen.getByRole('radio', { name: 'Ver em cards' })).toHaveAttribute('aria-checked', 'true');
  });

  it('selects services the same way in both views', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('checkbox', { name: /óleo/ }));
    expect(screen.getByText('1 serviço')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Ver em cards' }));
    expect(screen.getByRole('checkbox', { name: /óleo/ })).toBeChecked();
  });
});

