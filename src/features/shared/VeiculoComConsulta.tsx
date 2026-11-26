import { useState } from 'react';
import { get, useFormContext } from 'react-hook-form';
import { Car } from 'lucide-react';
import { FormSection } from '@/components/ui/FormSection';
import { VeiculoCampos } from '@/features/shared/VeiculoCampos';
import { usePlacaConsulta, type DadosPlaca, type DadosPlacaConsultada } from '@/features/shared/usePlacaConsulta';
import { PlacaHero } from '@/features/veiculos/PlacaHero';
import { VeiculoDadosValidacao } from '@/features/veiculos/VeiculoDadosValidacao';
import { normalizarPlaca } from '@/lib/placa';

/**
 * Veículo com a experiência do cadastro de veículo: placa em destaque com a lupa de consulta, os dados encontrados
 * separados dos que faltam (com a origem "Consulta" ou "Manual") e os mesmos campos. Serve a qualquer formulário que
 * guarde um veículo — o rascunho de orçamento e o cadastro de cliente —, bastando dizer como cada campo se chama lá.
 *
 * A consulta só roda no clique da lupa (cada uma pode cobrar da carteira da oficina) e só completa campos vazios.
 */
export function VeiculoComConsulta({
  nomeDoCampo,
  ocultarKm,
  semKmEObservacoes,
  categoriaVazia,
}: {
  /** Traduz o campo ("placa", "marca"…) para o nome dele no formulário ("veiculoPlaca", "veiculosNovos.0.placa"…). */
  nomeDoCampo: (campo: string) => string;
  /** Esconde o KM atual (o rascunho de orçamento não o guarda). */
  ocultarKm?: boolean;
  /** Esconde KM e observações na seção que aparece depois da consulta. */
  semKmEObservacoes?: boolean;
  /** Categoria sem valor inicial: o consultor precisa escolher (ela decide a hora técnica). */
  categoriaVazia?: boolean;
}) {
  const { register, watch, setValue, getValues, formState } = useFormContext();
  const erro = (campo: string) => get(formState.errors, nomeDoCampo(campo)) as { message?: string } | undefined;
  // Dados que a consulta devolveu (e a placa a que se referem): base do indicador "Consulta" × "Manual".
  const [dadosConsulta, setDadosConsulta] = useState<(Partial<DadosPlaca> & { placa: string }) | null>(null);

  const placaDigitada = watch(nomeDoCampo('placa')) as string | undefined;
  const consulta = usePlacaConsulta(placaDigitada, aplicarDadosConsulta);
  // Só vale para a placa que está no campo agora: mudou a placa, volta ao preenchimento manual.
  const consultaVigente = dadosConsulta && dadosConsulta.placa === normalizarPlaca(placaDigitada) ? dadosConsulta : null;

  // Nunca sobrescreve o que o usuário já digitou: só completa campos vazios.
  function aplicarDadosConsulta(dados: DadosPlacaConsultada) {
    const { placa: placaConsultada, ...campos } = dados;
    setDadosConsulta((anterior) => {
      const base = anterior && anterior.placa === (placaConsultada ?? anterior.placa) ? anterior : { placa: placaConsultada ?? '' };
      const novos = Object.fromEntries(Object.entries(campos).filter(([, v]) => v != null && v !== ''));
      return { ...base, ...novos, placa: placaConsultada ?? base.placa };
    });
    for (const [campo, valor] of Object.entries(campos)) {
      if (valor == null || valor === '') continue;
      const nome = nomeDoCampo(campo);
      const atual = getValues(nome) as unknown;
      if (atual != null && atual !== '') continue;
      setValue(nome, valor, { shouldDirty: true });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PlacaHero register={register} campo={nomeDoCampo('placa')} error={erro('placa')?.message} consulta={consulta} />

      {consultaVigente ? (
        <VeiculoDadosValidacao
          placa={consultaVigente.placa}
          dadosConsulta={consultaVigente}
          register={register}
          watch={watch}
          errors={formState.errors}
          consulta={consulta}
          nomeDoCampo={nomeDoCampo}
          semKmEObservacoes={semKmEObservacoes}
        />
      ) : (
        <FormSection title="Dados do veículo" icon={Car}>
          <VeiculoCampos
            register={register}
            watch={watch}
            setValue={setValue}
            errors={{
              placa: erro('placa'),
              modelo: erro('modelo'),
              cor: erro('cor'),
              anoFabricacao: erro('anoFabricacao'),
              chassi: erro('chassi'),
              categoria: erro('categoria'),
            }}
            categoriaVazia={categoriaVazia}
            ocultarPlaca
            ocultarKm={ocultarKm}
            nomeDoCampo={nomeDoCampo}
          />
        </FormSection>
      )}
    </div>
  );
}
