import clsx from 'clsx';
import { Controller, useFormContext } from 'react-hook-form';
import { UserCheck, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useClientes } from '@/hooks/useClientes';
import { useAuthStore } from '@/store/authStore';
import { formatDocumento, formatPhone } from '@/lib/formatters';
import { termoBuscaDuplicata, type ModoCliente } from './orcamentoModo';

const OPCOES: { valor: ModoCliente; titulo: string; descricao: string }[] = [
  { valor: 'CADASTRADO', titulo: 'Cliente cadastrado', descricao: 'Escolher cliente e veículo' },
  { valor: 'INTERESSADO', titulo: 'Ainda não cadastrado', descricao: 'Orçar agora, cadastrar depois' },
];

/** Alternância entre os dois jeitos de começar o orçamento. Trocar de modo não apaga o que foi digitado no outro. */
export function SeletorModoCliente({
  modo,
  onChange,
  disabled,
}: {
  modo: ModoCliente;
  onChange: (modo: ModoCliente) => void;
  disabled?: boolean;
}) {
  return (
    // Botões com aria-pressed (cada um é um tab stop): radio exigiria navegação por setas que não implementamos.
    <div role="group" aria-label="Como identificar o cliente" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {OPCOES.map((op) => {
        const ativo = op.valor === modo;
        const Icone = op.valor === 'CADASTRADO' ? UserCheck : UserPlus;
        return (
          <button
            key={op.valor}
            type="button"
            aria-pressed={ativo}
            disabled={disabled}
            onClick={() => onChange(op.valor)}
            className={clsx(
              'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60',
              ativo
                ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-border bg-surface text-ink-muted hover:bg-surface-alt',
            )}
          >
            <Icone size={20} aria-hidden />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{op.titulo}</span>
              <span className="text-xs">{op.descricao}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Dados do interessado (o veículo avulso tem a própria seção: ver VeiculoAvulsoSecao). */
export function CamposInteressado({ disabled }: { disabled?: boolean }) {
  const { register, control, formState } = useFormContext();
  const errors = formState.errors as Record<string, { message?: string } | undefined>;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Nome do cliente"
          required
          disabled={disabled}
          placeholder="Como ele se apresentou"
          error={errors.interessadoNome?.message}
          {...register('interessadoNome')}
        />
        <Controller
          control={control}
          name="interessadoTelefone"
          render={({ field }) => (
            <Input
              label="Telefone / WhatsApp"
              type="tel"
              inputMode="tel"
              disabled={disabled}
              placeholder="(00) 00000-0000"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(formatPhone(e.target.value))}
              onBlur={field.onBlur}
              error={errors.interessadoTelefone?.message}
            />
          )}
        />
        <Input
          label="E-mail"
          type="email"
          disabled={disabled}
          error={errors.interessadoEmail?.message}
          {...register('interessadoEmail')}
        />
      </div>
    </div>
  );
}

/**
 * Ao passar de "ainda não cadastrado" para "cadastrado", procura cadastros
 * parecidos pelo telefone/e-mail já digitados — evita cadastrar em duplicidade.
 * Só renderiza se houver termo de busca e resultado.
 */
export function SugestoesClienteExistente({
  telefone,
  email,
  onEscolher,
}: {
  telefone?: string;
  email?: string;
  onEscolher: (clienteId: number, nome: string) => void;
}) {
  const termo = termoBuscaDuplicata({ interessadoTelefone: telefone, interessadoEmail: email });
  // Perfil sem CLIENTE_READ levaria 403 (e o toast global de "sem permissão") — sem permissão, sem sugestão.
  const podeLerClientes = useAuthStore((s) => s.hasPermission)('CLIENTE_READ');
  const { data } = useClientes({ size: 3, busca: termo }, { enabled: !!termo && podeLerClientes });
  const achados = data?.content ?? [];
  if (!termo || !podeLerClientes || achados.length === 0) return null;
  return (
    <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
      <p className="mb-2 font-medium text-ink">Este contato já pode estar cadastrado:</p>
      <ul className="flex flex-col gap-2">
        {achados.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-ink">
              {c.nome}
              <span className="ml-2 text-xs text-ink-muted">
                {c.telefone ? formatPhone(c.telefone) : c.documento ? formatDocumento(c.documento, c.tipoPessoa === 'PJ' ? 'PJ' : 'PF') : ''}
              </span>
            </span>
            <Button type="button" variant="secondary" onClick={() => onEscolher(c.id!, c.nome ?? '')}>
              Usar este cadastro
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
