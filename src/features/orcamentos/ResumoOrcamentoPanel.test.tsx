import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResumoOrcamentoPanel, pendenciasEnvio } from './ResumoOrcamentoPanel';
import type { ItemFormValue } from '../shared/ItemsEditor';

const servico: ItemFormValue = { tipoItem: 'SERVICO', servicoId: 1, descricao: 'Revisão', quantidade: 1, valorUnitario: 100 };
const livre = { tipoItem: 'PRODUTO' as const, descricao: 'Pastilha', quantidade: 2, valorUnitario: 50, custoUnitario: 30 };

describe('pendenciasEnvio', () => {
  it('cliente cadastrado completo e com item: nada pendente', () => {
    const p = pendenciasEnvio({ semCadastro: false, clienteId: 1, veiculoId: 2, itens: [servico] });
    expect(p.every((x) => x.ok)).toBe(true);
  });

  it('sem cadastro: cliente e veículo ficam pendentes mesmo com ids residuais no form', () => {
    const p = pendenciasEnvio({ semCadastro: true, clienteId: 1, veiculoId: 2, itens: [servico] });
    expect(p.filter((x) => !x.ok).map((x) => x.rotulo)).toEqual(['Cliente cadastrado', 'Veículo cadastrado']);
  });

  it('sem itens e serviço por hora técnica sem tempo viram pendências', () => {
    expect(pendenciasEnvio({ semCadastro: false, clienteId: 1, veiculoId: 2, itens: [] }).find((x) => !x.ok)?.rotulo).toBe('Ao menos 1 item');
    const p = pendenciasEnvio({ semCadastro: false, clienteId: 1, veiculoId: 2, itens: [{ precificadoPorHT: true }] });
    expect(p.at(-1)).toEqual({ rotulo: 'Tempo vendido dos serviços', ok: false });
  });
});

describe('ResumoOrcamentoPanel', () => {
  it('mostra o total e o lucro interno; sem itens o total é R$ 0,00 (nunca some)', () => {
    const { rerender } = render(
      <form>
        <ResumoOrcamentoPanel itens={[]} pendencias={[]} mostrarSalvar saving={false} rotuloSalvar="Criar rascunho" />
      </form>,
    );
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 0,00');
    rerender(
      <form>
        <ResumoOrcamentoPanel itens={[servico, livre]} pendencias={[]} mostrarSalvar saving={false} rotuloSalvar="Criar rascunho" />
      </form>,
    );
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 200,00');
    expect(screen.getByTestId('resumo-interno')).toHaveTextContent('lucro');
  });

  it('sem pendências a listar (orçamento não editável), o checklist some', () => {
    render(<ResumoOrcamentoPanel itens={[servico]} pendencias={[]} mostrarSalvar={false} saving={false} rotuloSalvar="Salvar" />);
    expect(screen.queryByText('Para enviar ao cliente')).not.toBeInTheDocument();
    expect(screen.queryByText(/Tudo pronto/)).not.toBeInTheDocument();
  });

  it('esconde o botão de salvar em modo somente leitura e marca pendências com texto, não só cor', () => {
    render(
      <ResumoOrcamentoPanel
        itens={[]}
        pendencias={[{ rotulo: 'Cliente cadastrado', ok: false }]}
        mostrarSalvar={false}
        saving={false}
        rotuloSalvar="Salvar alterações"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument();
    expect(screen.getByText(/pendente/)).toBeInTheDocument();
  });
});
