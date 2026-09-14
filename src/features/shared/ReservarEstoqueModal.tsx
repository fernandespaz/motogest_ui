import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useReservarEstoque } from '@/hooks/useReservasEstoque';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { OrigemDesconto } from '@/api/types';

export function ReservarEstoqueModal({
  open,
  onClose,
  referenciaTipo,
  referenciaId,
  produtoId,
  produtoNome,
  quantidadeSugerida,
  estoqueDisponivel,
}: {
  open: boolean;
  onClose: () => void;
  referenciaTipo: OrigemDesconto;
  referenciaId: number;
  produtoId: number;
  produtoNome: string;
  quantidadeSugerida: number;
  estoqueDisponivel: number;
}) {
  const [quantidade, setQuantidade] = useState(String(Math.min(quantidadeSugerida, estoqueDisponivel) || 1));
  const reservar = useReservarEstoque();

  const numero = Math.trunc(Number(quantidade));
  const valido = Number.isFinite(numero) && numero > 0 && numero <= estoqueDisponivel;

  function fechar() {
    setQuantidade(String(Math.min(quantidadeSugerida, estoqueDisponivel) || 1));
    onClose();
  }

  async function confirmar() {
    if (!valido) return;
    try {
      await reservar.mutateAsync({ produtoId, payload: { quantidade: numero, referenciaTipo, referenciaId } });
      toast.success('Estoque reservado.');
      fechar();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível reservar o estoque.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Reservar estoque"
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={fechar} disabled={reservar.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} loading={reservar.isPending} disabled={!valido}>
            Reservar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-ink-muted">Produto</p>
          <p className="text-sm font-semibold text-ink">{produtoNome}</p>
          <p className="text-xs text-ink-muted">Estoque disponível: {estoqueDisponivel}</p>
        </div>

        <Input
          label="Quantidade a reservar"
          type="number"
          step="1"
          min="1"
          max={estoqueDisponivel}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          error={!valido && quantidade.trim() !== '' ? 'Quantidade inválida ou maior que o disponível' : undefined}
        />

        <p className="text-xs text-ink-muted">
          A reserva expira automaticamente após alguns dias sem uso e pode ser liberada manualmente a qualquer
          momento.
        </p>
      </div>
    </Modal>
  );
}
