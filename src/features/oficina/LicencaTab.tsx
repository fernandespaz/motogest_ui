import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useLicencaAtual, useUpgradeLicenca } from '@/hooks/useOficina';
import { licencaStatusMeta, metaFor } from '@/lib/statusMeta';
import { formatDate } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  plano: z.string().min(1, 'Selecione um plano'),
  provedorPagamento: z.string().min(1, 'Selecione a forma de pagamento'),
});

type FormValues = z.infer<typeof schema>;

export function LicencaTab() {
  const { data: licenca, isLoading } = useLicencaAtual();
  const upgrade = useUpgradeLicenca();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { plano: 'PRO', provedorPagamento: 'CARTAO' } });

  async function onSubmit(values: FormValues) {
    try {
      await upgrade.mutateAsync(values);
      toast.success('Licença atualizada com sucesso.');
      setShowForm(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível concluir o upgrade.'));
    }
  }

  if (isLoading || !licenca) return <PageSpinner />;

  const meta = metaFor(licencaStatusMeta, licenca.status);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">Status da licença</p>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <p className="text-sm text-ink-muted">Plano atual: {licenca.plano ?? 'Trial gratuito'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-muted">Ativação</p>
              <p className="text-sm font-medium text-ink">{formatDate(licenca.dataAtivacao)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Expiração</p>
              <p className="text-sm font-medium text-ink">{formatDate(licenca.dataExpiracao)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Dias restantes</p>
              <p className={`text-sm font-medium ${(licenca.diasRestantes ?? 0) <= 2 ? 'text-danger' : 'text-ink'}`}>
                {licenca.diasRestantes ?? 0}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {licenca.status !== 'ATIVA' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand-600" />
                <p className="font-semibold text-ink">Faça upgrade para continuar usando sem limites</p>
              </div>

              {!showForm ? (
                <Button className="self-start" onClick={() => setShowForm(true)}>
                  Fazer upgrade
                </Button>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                  <Select label="Plano" required error={errors.plano?.message} {...register('plano')}>
                    <option value="BASICO">Básico</option>
                    <option value="PRO">Pro</option>
                    <option value="PREMIUM">Premium</option>
                  </Select>
                  <Select label="Forma de pagamento" required error={errors.provedorPagamento?.message} {...register('provedorPagamento')}>
                    <option value="CARTAO">Cartão de crédito</option>
                    <option value="PIX">Pix</option>
                    <option value="BOLETO">Boleto</option>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" loading={upgrade.isPending}>
                      Confirmar upgrade
                    </Button>
                  </div>
                </form>
              )}
            </CardBody>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
