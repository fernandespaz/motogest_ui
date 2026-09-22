import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Checkbox } from '@/components/ui/Field';
import { useCreateUsuario, useUpdateUsuario } from '@/hooks/useUsuarios';
import { usePerfis } from '@/hooks/usePerfis';
import type { UsuarioResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage, getBusinessErrorCode, mensagemSeguraParaUsuario } from '@/api/client';

const FORM_ID = 'usuario-form';

const baseSchema = {
  nome: z.string().min(1, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  perfilId: z.coerce.number().positive('Selecione o perfil'),
  ativo: z.boolean().optional(),
};

const createSchema = z.object({ ...baseSchema, senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres') });
const editSchema = z.object({ ...baseSchema, senha: z.string().optional() });

export function UsuarioFormModal({
  open,
  onClose,
  usuario,
}: {
  open: boolean;
  onClose: () => void;
  usuario?: UsuarioResponse | null;
}) {
  const isEditing = !!usuario;
  const createMutation = useCreateUsuario();
  const updateMutation = useUpdateUsuario();
  const { data: perfis } = usePerfis();
  const navigate = useNavigate();
  const [limiteExcedidoMsg, setLimiteExcedidoMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: { ativo: true },
  });

  useEffect(() => {
    if (open) {
      setLimiteExcedidoMsg(null);
      reset(
        usuario
          ? {
              nome: usuario.nome ?? '',
              email: usuario.email ?? '',
              perfilId: usuario.perfilId ?? 0,
              ativo: usuario.ativo ?? true,
              senha: '',
            }
          : { ativo: true },
      );
    }
  }, [open, usuario, reset]);

  async function onSubmit(values: z.infer<typeof createSchema>) {
    try {
      const payload = values.senha ? values : { ...values, senha: undefined };
      if (isEditing && usuario?.id != null) {
        await updateMutation.mutateAsync({ id: usuario.id, payload });
        toast.success('Usuário atualizado.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Usuário cadastrado.');
      }
      onClose();
    } catch (error) {
      const businessError = getBusinessErrorCode(error);
      if (businessError?.codigo === 'LIMITE_USUARIOS_EXCEDIDO') {
        setLimiteExcedidoMsg(
          mensagemSeguraParaUsuario(businessError.mensagem, 'Seu plano atingiu o limite de usuários ativos.'),
        );
        return;
      }
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o usuário.'));
    }
  }

  function irParaPlanos() {
    onClose();
    navigate('/oficina/licenca');
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar usuário' : 'Novo usuário'}
      footer={
        limiteExcedidoMsg ? (
          <Button type="button" onClick={irParaPlanos}>
            Fazer upgrade
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} loading={saving}>
              Salvar
            </Button>
          </>
        )
      }
    >
      {limiteExcedidoMsg ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-semibold text-ink">Limite de usuários atingido</h2>
          <p className="text-sm text-ink-muted">{limiteExcedidoMsg}</p>
        </div>
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
          <Input label="E-mail" type="email" required error={errors.email?.message} {...register('email')} />
          <Select label="Perfil de acesso" required error={errors.perfilId?.message} {...register('perfilId')}>
            <option value={0}>Selecione...</option>
            {perfis?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <Input
            label={isEditing ? 'Nova senha' : 'Senha'}
            type="password"
            hint={isEditing ? 'Deixe em branco para manter a senha atual' : 'Mínimo de 6 caracteres'}
            error={errors.senha?.message}
            required={!isEditing}
            {...register('senha')}
          />
          {isEditing && <Checkbox label="Usuário ativo" {...register('ativo')} />}
        </form>
      )}
    </Modal>
  );
}
