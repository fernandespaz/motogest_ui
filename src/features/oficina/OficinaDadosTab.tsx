import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { BrandMark } from '@/components/ui/BrandMark';
import { useOficinaAtual, useAtualizarOficina } from '@/hooks/useOficina';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { formatCnpj } from '@/lib/formatters';

const schema = z.object({
  razaoSocial: z.string().min(1, 'Informe a razão social'),
  nomeFantasia: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  cep: z.string().optional(),
  logoUrl: z
    .string()
    .max(500, 'A URL deve ter no máximo 500 caracteres')
    .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Informe uma URL válida (http:// ou https://)')
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export function OficinaDadosTab() {
  const { data: oficina, isLoading } = useOficinaAtual();
  const atualizar = useAtualizarOficina();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const logoUrlPreview = useWatch({ control, name: 'logoUrl' });

  useEffect(() => {
    if (oficina) {
      reset({
        razaoSocial: oficina.razaoSocial ?? '',
        nomeFantasia: oficina.nomeFantasia ?? '',
        email: oficina.email ?? '',
        telefone: oficina.telefone ?? '',
        logradouro: oficina.logradouro ?? '',
        numero: oficina.numero ?? '',
        bairro: oficina.bairro ?? '',
        cidade: oficina.cidade ?? '',
        uf: oficina.uf ?? '',
        cep: oficina.cep ?? '',
        logoUrl: oficina.logoUrl ?? '',
      });
    }
  }, [oficina, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await atualizar.mutateAsync(values);
      toast.success('Dados da oficina atualizados.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível atualizar os dados.'));
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <BrandMark logoUrl={logoUrlPreview} size="lg" />
            <div className="flex-1">
              <Input
                label="URL do logo"
                placeholder="https://minha-oficina.com/logo.png"
                hint="Usado na barra lateral, no topo do app e (em breve) na tela de login"
                error={errors.logoUrl?.message}
                {...register('logoUrl')}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="CNPJ" value={formatCnpj(oficina?.cnpj ?? '')} disabled />
            <Input label="Razão social" required error={errors.razaoSocial?.message} {...register('razaoSocial')} />
            <Input label="Nome fantasia" {...register('nomeFantasia')} />
            <Input label="E-mail" type="email" required error={errors.email?.message} {...register('email')} />
            <Input label="Telefone" {...register('telefone')} />
            <Input label="CEP" {...register('cep')} />
            <Input label="Logradouro" {...register('logradouro')} />
            <Input label="Número" {...register('numero')} />
            <Input label="Bairro" {...register('bairro')} />
            <Input label="Cidade" {...register('cidade')} />
            <Input label="UF" maxLength={2} {...register('uf')} />
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" loading={atualizar.isPending}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
