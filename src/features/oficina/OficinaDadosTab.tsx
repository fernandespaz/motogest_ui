import { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Trash2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { BrandMark } from '@/components/ui/BrandMark';
import {
  useOficinaAtual,
  useAtualizarOficina,
  useOficinaLogoSrc,
  useEnviarLogoOficina,
  useRemoverLogoOficina,
} from '@/hooks/useOficina';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { formatCnpj } from '@/lib/formatters';

const LOGO_TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5MB — mesmo limite validado no backend

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
  const logoSrc = useOficinaLogoSrc();
  const enviarLogo = useEnviarLogoOficina();
  const removerLogo = useRemoverLogoOficina();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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

  async function handleArquivoSelecionado(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois, se precisar reenviar
    if (!arquivo) return;

    if (!LOGO_TIPOS_ACEITOS.includes(arquivo.type)) {
      toast.error('Envie uma imagem PNG, JPEG ou WEBP.');
      return;
    }
    if (arquivo.size > LOGO_TAMANHO_MAXIMO) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    try {
      await enviarLogo.mutateAsync(arquivo);
      toast.success('Logo atualizado com sucesso.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível enviar o logo.'));
    }
  }

  async function handleRemoverLogo() {
    try {
      await removerLogo.mutateAsync();
      toast.success('Logo removido.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o logo.'));
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <Card>
      <CardBody>
        <div className="mb-6 flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center">
          <BrandMark logoUrl={logoSrc} size="lg" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Logo da oficina</p>
            <p className="text-xs text-ink-muted">
              PNG, JPEG ou WEBP, até 5MB — aparece na barra lateral e no topo do app.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleArquivoSelecionado}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={enviarLogo.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> Enviar logo
            </Button>
            {oficina?.logoImagemDisponivel && (
              <Button type="button" variant="outline" size="sm" loading={removerLogo.isPending} onClick={handleRemoverLogo}>
                <Trash2 size={14} /> Remover
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
            <Input
              label="URL do logo (alternativa)"
              placeholder="https://minha-oficina.com/logo.png"
              hint="Usada só se nenhuma imagem for enviada acima"
              error={errors.logoUrl?.message}
              {...register('logoUrl')}
            />
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
