import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { useSolicitarDesconto } from '@/hooks/useDescontos';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { formatCurrency } from '@/lib/formatters';
import type { OrigemDesconto } from '@/api/types';

type Modo = 'percentual' | 'valor';

export function SolicitarDescontoModal({
  open,
  onClose,
  origemTipo,
  origemId,
  itemId,
  itemDescricao,
  valorUnitarioAtual,
}: {
  open: boolean;
  onClose: () => void;
  origemTipo: OrigemDesconto;
  origemId: number;
  itemId: number;
  itemDescricao: string;
  valorUnitarioAtual: number;
}) {
  const [modo, setModo] = useState<Modo>('percentual');
  const [valor, setValor] = useState('');
  const solicitar = useSolicitarDesconto();

  const numero = Number(valor.replace(',', '.'));
  const valido = valor.trim() !== '' && Number.isFinite(numero) && numero > 0;
  const valorUnitarioPrevisto =
    valido && modo === 'percentual'
      ? valorUnitarioAtual * (1 - numero / 100)
      : valido
        ? numero
        : undefined;

  function fechar() {
    setValor('');
    setModo('percentual');
    onClose();
  }

  async function confirmar() {
    if (!valido) return;
    try {
      await solicitar.mutateAsync({
        origemTipo,
        origemId,
        itemId,
        percentualDesconto: modo === 'percentual' ? numero : undefined,
        valorUnitarioSolicitado: modo === 'valor' ? numero : undefined,
      });
      toast.success('Desconto solicitado — aguardando aprovação.');
      fechar();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível solicitar o desconto.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Solicitar desconto"
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={fechar} disabled={solicitar.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} loading={solicitar.isPending} disabled={!valido}>
            Solicitar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-ink-muted">Item</p>
          <p className="text-sm font-semibold text-ink">{itemDescricao}</p>
          <p className="text-xs text-ink-muted">Valor unitário atual: {formatCurrency(valorUnitarioAtual)}</p>
        </div>

        <Select
          label="Tipo"
          value={modo}
          onChange={(e) => {
            setModo(e.target.value as Modo);
            setValor('');
          }}
        >
          <option value="percentual">% de desconto</option>
          <option value="valor">Novo valor unitário</option>
        </Select>

        <Input
          label={modo === 'percentual' ? 'Percentual de desconto' : 'Valor unitário solicitado'}
          type="number"
          step="0.01"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          hint={
            valorUnitarioPrevisto != null
              ? `Valor unitário após aprovação: ${formatCurrency(valorUnitarioPrevisto)}`
              : undefined
          }
        />

        <p className="text-xs text-ink-muted">
          A solicitação fica pendente até um Administrador aprovar — o valor só muda de verdade depois disso.
        </p>
      </div>
    </Modal>
  );
}
