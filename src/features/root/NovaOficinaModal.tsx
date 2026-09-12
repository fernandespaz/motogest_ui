import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { onlyDigits, formatCnpj } from '@/lib/formatters';
import { extractErrorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { useCriarOficinaAdmin } from '@/hooks/useOficinasAdmin';

const schema = z.object({
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
  adminSenha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
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
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await criar.mutateAsync(values);
      toast.success('Oficina cadastrada com sucesso.');
      reset();
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível cadastrar a oficina.'));
    }
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
              label="E-mail de acesso"
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
              hint="Mínimo de 6 caracteres"
              {...register('adminSenha')}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
