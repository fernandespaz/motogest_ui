import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select } from '@/components/ui/Field';
import { useAtualizarConfiguracaoFiscal, useRegimesTributarios } from '@/hooks/useFiscal';
import { onlyDigits } from '@/lib/formatters';
import type { ConfiguracaoFiscalResponse } from '@/api/types';
import {
  configuracaoFiscalSchema,
  toFormValues,
  toRequest,
  usaAliquotaIss,
  usaAliquotaSimples,
  type ConfiguracaoFiscalForm,
} from './configuracaoFiscal';
import { alertaDeErro } from './fiscalAlertas';
import type { Alerta } from './useAlerta';

interface Props {
  config: ConfiguracaoFiscalResponse;
  podeEditar: boolean;
  mostrar: (alerta: Alerta) => void;
}

export function DadosFiscaisCard({ config, podeEditar, mostrar }: Props) {
  const { data: regimes } = useRegimesTributarios();
  const atualizar = useAtualizarConfiguracaoFiscal();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ConfiguracaoFiscalForm>({
    resolver: zodResolver(configuracaoFiscalSchema),
    defaultValues: toFormValues(config),
  });

  // Reflete o que o servidor salvou (inclusive depois de salvar daqui ou da habilitação).
  useEffect(() => {
    reset(toFormValues(config));
  }, [config, reset]);

  const regime = watch('regimeTributario');
  const desabilitado = !podeEditar || atualizar.isPending;

  async function salvar(values: ConfiguracaoFiscalForm) {
    try {
      await atualizar.mutateAsync(
        toRequest(values, {
          emissaoHabilitada: config.emissaoHabilitada ?? false,
          ambiente: config.ambiente ?? 'HOMOLOGACAO',
          provedorEmpresaRef: config.provedorEmpresaRef,
        }),
      );
      mostrar({ tone: 'success', title: 'Dados fiscais salvos', message: 'As informações fiscais foram atualizadas.' });
    } catch (error) {
      mostrar(alertaDeErro(error, 'Não foi possível salvar os dados fiscais', 'Confira os campos e tente novamente.'));
    }
  }

  // Campos numéricos aceitam só dígitos — o formato é validado pelo schema, mas
  // digitar letra nem deve ser possível.
  const apenasDigitos = (campo: 'codigoMunicipioIbge' | 'codigoServico' | 'cnae', max: number) => ({
    ...register(campo, {
      onChange: (e) => {
        e.target.value = onlyDigits(e.target.value).slice(0, max);
      },
    }),
  });

  return (
    <Card>
      <CardHeader
        title="1. Dados fiscais"
        subtitle="Regime tributário e códigos usados na emissão. Pode salvar incompleto e voltar depois."
      />
      <CardBody>
        <form onSubmit={handleSubmit(salvar)} className="space-y-4" noValidate>
          <Controller
            name="regimeTributario"
            control={control}
            render={({ field }) => (
              <Select
                label="Regime tributário"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={desabilitado}
                error={errors.regimeTributario?.message}
              >
                <option value="">Selecione...</option>
                {regimes?.map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.descricao}
                  </option>
                ))}
              </Select>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Código IBGE do município"
              inputMode="numeric"
              maxLength={7}
              hint="7 dígitos. Brasília/DF = 5300108"
              error={errors.codigoMunicipioIbge?.message}
              disabled={desabilitado}
              {...apenasDigitos('codigoMunicipioIbge', 7)}
            />
            <Input
              label="Código de tributação nacional"
              inputMode="numeric"
              maxLength={6}
              hint="6 dígitos (item, subitem e desdobro da LC 116). Confirme com seu contador."
              error={errors.codigoServico?.message}
              disabled={desabilitado}
              {...apenasDigitos('codigoServico', 6)}
            />
            <Input
              label="Inscrição municipal"
              maxLength={20}
              error={errors.inscricaoMunicipal?.message}
              disabled={desabilitado}
              {...register('inscricaoMunicipal')}
            />
            <Input
              label="Código de serviço municipal"
              maxLength={20}
              hint="Opcional"
              error={errors.codigoServicoMunicipal?.message}
              disabled={desabilitado}
              {...register('codigoServicoMunicipal')}
            />
            <Input
              label="CNAE"
              inputMode="numeric"
              maxLength={7}
              hint="Opcional — 7 dígitos"
              error={errors.cnae?.message}
              disabled={desabilitado}
              {...apenasDigitos('cnae', 7)}
            />

            {usaAliquotaSimples(regime) && (
              <Input
                label="Percentual aproximado de tributos (%)"
                inputMode="decimal"
                hint="Simples Nacional / MEI. O MEI pode informar 0."
                error={errors.aliquotaSimplesNacional?.message}
                disabled={desabilitado}
                {...register('aliquotaSimplesNacional')}
              />
            )}
            {usaAliquotaIss(regime) && (
              <Input
                label="Alíquota de ISS (%)"
                inputMode="decimal"
                hint="De 0 a 5"
                error={errors.aliquotaIss?.message}
                disabled={desabilitado}
                {...register('aliquotaIss')}
              />
            )}
          </div>

          <Checkbox label="ISS retido pelo tomador do serviço" disabled={desabilitado} {...register('issRetido')} />

          {podeEditar && (
            <div className="flex justify-end">
              <Button type="submit" loading={atualizar.isPending} disabled={!isDirty}>
                Salvar dados fiscais
              </Button>
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
