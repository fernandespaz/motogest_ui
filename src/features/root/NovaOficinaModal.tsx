import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { onlyDigits, formatCnpj } from '@/lib/formatters';
import { extractErrorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { isSenhaForte, SENHA_FRACA_MSG, SENHA_HINT, SENHA_NAO_CONFERE_MSG } from '@/lib/senha';
import { useCriarOficinaAdmin } from '@/hooks/useOficinasAdmin';
import { linkDeAcesso } from '@/lib/loginOficina';

const schema = z
  .object({
  razaoSocial: z.string().min(1, 'Informe a razão social'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().transform(onlyDigits).refine((v) => v.length === 14, 'CNPJ deve ter 14 dígitos'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  cep: z.string().optional(),
  adminNome: z.string().min(1, 'Informe o nome do administrador'),
  adminEmail: z.string().email('E-mail inválido'),
  adminSenha: z.string().min(1, 'Informe a senha').refine(isSenhaForte, SENHA_FRACA_MSG),
  adminConfirmacaoSenha: z.string().min(1, 'Confirme a senha'),
})
  .refine((v) => v.adminSenha === v.adminConfirmacaoSenha, {
    message: SENHA_NAO_CONFERE_MSG,
    path: ['adminConfirmacaoSenha'],
  });

type FormValues = z.infer<typeof schema>;

const FORM_ID = 'nova-oficina-form';

export function NovaOficinaModal({
  open,
  onClose,
  adminToken,
}: {
  open: boolean;
  onClose: () => void;
  adminToken: string;
}) {
  const criar = useCriarOficinaAdmin(adminToken);
  // Códigos gerados pelo sistema: aparecem UMA vez, logo depois do cadastro, para serem passados ao cliente.
  const [cadastrada, setCadastrada] = useState<{ nome: string; oficina: string; admin: string } | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Mesmo padrão dos demais formulários de criação do app: reseta sempre que
  // o modal abre, não só depois de um cadastro bem-sucedido — sem isso, um
  // Cancelar no meio do preenchimento deixava os campos preenchidos quando o
  // modal reabria pra cadastrar a próxima oficina.
  useEffect(() => {
    if (open) {
      reset();
      setCadastrada(null);
    }
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const criada = await criar.mutateAsync(values);
      toast.success('Oficina cadastrada com sucesso.');
      setCadastrada({
        nome: criada.nomeFantasia || criada.razaoSocial || 'Oficina',
        oficina: criada.codigoAcesso ?? '',
        admin: criada.adminCodigo ?? '',
      });
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível cadastrar a oficina.'));
    }
  }

  if (cadastrada) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Oficina cadastrada"
        footer={<Button onClick={onClose}>Concluir</Button>}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            <strong className="text-ink">{cadastrada.nome}</strong> foi cadastrada. Passe estes códigos ao cliente: eles são
            gerados pelo sistema e <strong className="text-ink">não podem ser alterados</strong>. Quem entra usa o código da
            oficina, o código do usuário e a senha definida no cadastro.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CodigoGerado rotulo="Código da oficina" valor={cadastrada.oficina} />
            <CodigoGerado rotulo="Código do administrador" valor={cadastrada.admin} />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void copiar(linkDeAcesso(cadastrada.oficina), 'Link de acesso copiado.')}
          >
            Copiar link de acesso
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova oficina"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={criar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={criar.isPending}>
            Cadastrar oficina
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Razão social" required error={errors.razaoSocial?.message} {...register('razaoSocial')} />
          <Input label="Nome fantasia" {...register('nomeFantasia')} />
          <Controller
            control={control}
            name="cnpj"
            render={({ field }) => (
              <Input
                label="CNPJ"
                required
                inputMode="numeric"
                value={formatCnpj(field.value ?? '')}
                onChange={(e) => field.onChange(onlyDigits(e.target.value))}
                error={errors.cnpj?.message}
              />
            )}
          />
          <Input label="E-mail da oficina" type="email" required error={errors.email?.message} {...register('email')} />
          <Input label="Telefone" {...register('telefone')} />
          <Input label="CEP" {...register('cep')} />
          <Input label="Logradouro" {...register('logradouro')} />
          <Input label="Número" {...register('numero')} />
          <Input label="Bairro" {...register('bairro')} />
          <Input label="Cidade" {...register('cidade')} />
          <Input label="UF" maxLength={2} {...register('uf')} />
        </div>

        <div className="mt-2 border-t border-border pt-4">
          <p className="mb-3 text-sm font-semibold text-ink">Usuário administrador da oficina</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" required error={errors.adminNome?.message} {...register('adminNome')} />
            <Input
              label="E-mail do administrador"
              type="email"
              required
              error={errors.adminEmail?.message}
              {...register('adminEmail')}
            />
            <Input
              label="Senha"
              type="password"
              required
              error={errors.adminSenha?.message}
              hint={SENHA_HINT}
              {...register('adminSenha')}
            />
            <Input
              label="Confirmar senha"
              type="password"
              required
              error={errors.adminConfirmacaoSenha?.message}
              {...register('adminConfirmacaoSenha')}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error('Não foi possível copiar. Anote: ' + texto);
  }
}

function CodigoGerado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-alt p-3">
      <p className="text-xs font-medium text-ink-muted">{rotulo}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-2xl font-semibold tracking-wider text-ink" data-testid={'codigo-' + rotulo}>
          {valor || '—'}
        </span>
        <Button type="button" variant="secondary" size="sm" disabled={!valor} onClick={() => void copiar(valor, 'Código copiado.')}>
          Copiar
        </Button>
      </div>
    </div>
  );
}
