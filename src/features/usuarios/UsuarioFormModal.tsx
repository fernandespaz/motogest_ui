import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TabPanel, Tabs } from '@/components/ui/Tabs';
import { useCreateUsuario, useUpdateUsuario, useUsuario } from '@/hooks/useUsuarios';
import { usePerfis } from '@/hooks/usePerfis';
import { useCepLookup } from '@/hooks/useCepLookup';
import type { UsuarioRequest, UsuarioResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { preventEnterSubmit } from '@/lib/preventEnterSubmit';
import { extractErrorMessage, getBusinessErrorCode, mensagemSeguraParaUsuario } from '@/api/client';
import { abasComErro, formParaColaborador, primeiraAbaComErro } from './colaborador';
import type { AbaUsuario } from './colaborador';
import { createSchema, editSchema, valoresIniciais } from './usuarioFormSchema';
import type { FormValues } from './usuarioFormSchema';
import { AbaAcesso, AbaContato, AbaContratacao, AbaPessoais } from './UsuarioFormAbas';

const FORM_ID = 'usuario-form';

const ABAS: { key: AbaUsuario; label: string }[] = [
  { key: 'acesso', label: 'Acesso' },
  { key: 'pessoais', label: 'Dados pessoais' },
  { key: 'contato', label: 'Contato e endereço' },
  { key: 'contratacao', label: 'Contratação' },
];

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
  // A lista não traz os dados de RH (LGPD) — só o GET /usuarios/{id}. Salvar
  // antes disso chegar enviaria o cadastro "vazio" e apagaria o que já existe.
  const detalhe = useUsuario(open ? usuario?.id : undefined);
  const navigate = useNavigate();
  // Dado de RH (CPF, salário...) só pra quem pode gravar usuários.
  const podeVerRh = useAuthStore((s) => s.hasPermission)('USUARIO_WRITE');
  const { buscando: buscandoCep, buscar: buscarCep } = useCepLookup();
  const [limiteExcedidoMsg, setLimiteExcedidoMsg] = useState<string | null>(null);
  const [aba, setAba] = useState<AbaUsuario>('acesso');

  const methods = useForm<FormValues>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: { ativo: true },
  });
  const { handleSubmit, reset, setValue, formState } = methods;

  const detalheId = detalhe.data?.id;
  useEffect(() => {
    if (open) {
      setLimiteExcedidoMsg(null);
      setAba('acesso');
      reset(valoresIniciais(detalhe.data ?? usuario));
    }
    // detalhe.data entra só pelo id: um refetch em segundo plano não pode
    // sobrescrever o que o usuário já digitou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, usuario, detalheId, reset]);

  async function handleCepBlur(cep: string) {
    const endereco = await buscarCep(cep);
    if (!endereco) return;
    setValue('logradouro', endereco.logradouro, { shouldDirty: true });
    setValue('bairro', endereco.bairro, { shouldDirty: true });
    setValue('cidade', endereco.cidade, { shouldDirty: true });
    setValue('uf', endereco.uf, { shouldDirty: true });
  }

  // Campos das outras abas não estão montados: sem isso o "Salvar" parecia
  // não fazer nada quando o erro estava numa aba escondida.
  function irParaPrimeiroErro(erros: FieldErrors<FormValues>) {
    const primeira = primeiraAbaComErro(Object.keys(erros));
    if (primeira) setAba(primeira);
  }

  async function onSubmit(values: FormValues) {
    try {
      const { senha, confirmacaoSenha, nome, email, perfilId, ativo } = values;
      const payload: UsuarioRequest = {
        nome,
        email,
        perfilId,
        ativo,
        senha: senha || undefined,
        confirmacaoSenha: senha ? confirmacaoSenha : undefined,
        ...(podeVerRh ? formParaColaborador(values, { limparVazios: isEditing }) : {}),
      };
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
      if (businessError?.codigo === 'CPF_JA_CADASTRADO') {
        setAba('pessoais');
        methods.setError('cpf', { message: 'Já existe um colaborador com este CPF' });
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
  const carregandoCadastro = isEditing && detalhe.isLoading;
  const falhouCarregar = isEditing && detalhe.isError;
  const comErro = abasComErro(Object.keys(formState.errors));
  const abas = ABAS.map((a) => ({ ...a, invalid: comErro.has(a.key) }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
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
            <Button type="submit" form={FORM_ID} loading={saving} disabled={carregandoCadastro || falhouCarregar}>
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
        <>
          {podeVerRh && <Tabs tabs={abas} active={aba} onChange={(k) => setAba(k as AbaUsuario)} />}
          {falhouCarregar && (
            <p role="alert" className="mb-3 text-sm text-danger">
              Não foi possível carregar o cadastro completo. Feche e abra novamente para editar.
            </p>
          )}
          {carregandoCadastro ? (
            <p className="py-8 text-center text-sm text-ink-muted">Carregando cadastro...</p>
          ) : (
            <FormProvider {...methods}>
              <form
                id={FORM_ID}
                onSubmit={handleSubmit(onSubmit, irParaPrimeiroErro)}
                onKeyDown={preventEnterSubmit}
                className="flex flex-col gap-5"
                noValidate
              >
                <TabPanel hidden={aba !== 'acesso'}>
                  <AbaAcesso isEditing={isEditing} perfis={perfis} />
                </TabPanel>
                <TabPanel hidden={!podeVerRh || aba !== 'pessoais'}>
                  <AbaPessoais />
                </TabPanel>
                <TabPanel hidden={!podeVerRh || aba !== 'contato'}>
                  <AbaContato buscandoCep={buscandoCep} onCepBlur={handleCepBlur} />
                </TabPanel>
                <TabPanel hidden={!podeVerRh || aba !== 'contratacao'}>
                  <AbaContratacao />
                </TabPanel>
              </form>
            </FormProvider>
          )}
        </>
      )}
    </Modal>
  );
}
