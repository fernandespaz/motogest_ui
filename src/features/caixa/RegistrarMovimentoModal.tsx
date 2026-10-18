import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useCategoriasFinanceiras, useRegistrarCaixa } from '@/hooks/useFinanceiro';
import { FORMAS_PAGAMENTO } from '@/lib/formaPagamento';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CaixaTipo } from '@/api/types';

const schema = z.object({
  categoriaNome: z.string().optional(),
  valor: z.coerce.number().positive('Informe um valor válido'),
  formaPagamento: z.enum(['DINHEIRO', 'CARTAO', 'PIX', 'TRANSFERENCIA']),
  descricao: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const VAZIO = { categoriaNome: '', formaPagamento: 'DINHEIRO', descricao: '' } as const;

/**
 * Lançamento avulso (sem conta vinculada). Contas a pagar/receber e OS têm fluxo próprio, que gera o
 * lançamento já vinculado — por isso aqui a categoria do backend é sempre OUTRO. Quem enxerga o
 * Financeiro escolhe uma categoria financeira (a mesma cadastrada lá), que vai à frente da descrição
 * pra manter o rastro; a saída sempre exige justificativa.
 * `tipo` vem fixado por qual botão (Entrada/Saída) abriu o modal — não é um campo editável aqui, ver MeuCaixaPage.
 */
export function RegistrarMovimentoModal({
  open,
  tipo,
  onClose,
}: {
  open: boolean;
  tipo: CaixaTipo;
  onClose: () => void;
}) {
  const registrar = useRegistrarCaixa();
  const podeVerCategorias = useAuthStore((s) => s.hasPermission('FINANCEIRO_READ'));
  const { data: categorias } = useCategoriasFinanceiras(
    { tipo: tipo === 'ENTRADA' ? 'RECEITA' : 'DESPESA' },
    { enabled: open && podeVerCategorias },
  );
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: VAZIO });

  useEffect(() => {
    if (open) reset({ ...VAZIO, valor: undefined });
  }, [open, reset]);

  async function onSubmit({ categoriaNome, descricao, ...values }: FormValues) {
    const texto = descricao?.trim() ?? '';
    if (tipo === 'SAIDA' && !texto) {
      setError('descricao', { message: 'Informe a justificativa da saída' });
      return;
    }
    const descricaoFinal = [categoriaNome ? `[${categoriaNome}]` : '', texto].filter(Boolean).join(' ');
    try {
      await registrar.mutateAsync({ ...values, categoria: 'OUTRO', descricao: descricaoFinal, tipo });
      toast.success(tipo === 'ENTRADA' ? 'Entrada registrada.' : 'Saída registrada.');
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível registrar o lançamento.'));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={tipo === 'ENTRADA' ? 'Nova entrada' : 'Nova saída'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {podeVerCategorias && (categorias?.length ?? 0) > 0 && (
          <Select label="Categoria" {...register('categoriaNome')}>
            <option value="">Sem categoria</option>
            {categorias!.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </Select>
        )}
        <Select label="Forma de pagamento" {...register('formaPagamento')}>
          {FORMAS_PAGAMENTO.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input label="Valor (R$)" type="number" step="0.01" required error={errors.valor?.message} {...register('valor')} />
        <Textarea
          label={tipo === 'SAIDA' ? 'Justificativa' : 'Descrição'}
          required={tipo === 'SAIDA'}
          error={errors.descricao?.message}
          {...register('descricao')}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={registrar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant={tipo === 'ENTRADA' ? 'success' : 'danger'} loading={registrar.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
