import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input, Select } from '@/components/ui/Field';
import { ModeloVeiculoField } from '@/features/shared/ModeloVeiculoField';
import { PlacaConsulta, type DadosPlaca } from '@/features/shared/PlacaConsulta';
import { CATEGORIAS_COMPLEXIDADE } from '@/lib/categoria';

interface VeiculoCamposErros {
  placa?: { message?: string };
  modelo?: { message?: string };
  cor?: { message?: string };
  anoFabricacao?: { message?: string };
  chassi?: { message?: string };
  categoria?: { message?: string };
}

/**
 * Os campos de um veículo, na mesma grade nas três telas que o editam (modal
 * de Veículo, veículos novos e veículos vinculados dentro do cadastro de
 * Cliente) — antes cada uma repetia a sua própria cópia, e a ordem/tamanho dos
 * campos já tinha começado a divergir. `prefix` aponta pro item dentro de um
 * array do form ("veiculosNovos.0"); sem ele os campos ficam na raiz.
 *
 * Em desktop são 3 linhas de 4 colunas: placa + catálogo de modelos; marca,
 * modelo, cor e categoria; anos, km e chassi.
 */
export function VeiculoCampos({
  register,
  watch,
  setValue,
  prefix,
  errors,
  estrito,
  categoriaVazia,
  consultaPlaca,
  ocultarPlaca,
  nomeDoCampo,
  ocultarKm,
}: {
  /** O rascunho de orçamento não guarda o KM (só o cadastro do veículo guarda). */
  ocultarKm?: boolean;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  prefix?: string;
  errors?: VeiculoCamposErros;
  /** Marca modelo, cor, ano de fabricação e chassi como obrigatórios (cadastro completo de um veículo). */
  estrito?: boolean;
  /** Mostra a opção vazia na categoria — veículo legado sem categoria precisa de uma escolha explícita. */
  categoriaVazia?: boolean;
  /** Mostra "Buscar dados da placa" — só em cadastro novo (na edição, os dados já existem e uma consulta cobraria à toa). */
  consultaPlaca?: boolean;
  /** Esconde o campo de placa (ela já foi informada em outro ponto da tela, como o hero do cadastro de veículo). */
  ocultarPlaca?: boolean;
  /**
   * Para formulários cujos campos de veículo têm outros nomes (o rascunho de orçamento usa "veiculoPlaca",
   * "veiculoMarca"…): traduz o nome do campo daqui ("placa", "marca"…) para o nome no form. Tem prioridade sobre `prefix`.
   */
  nomeDoCampo?: (campo: string) => string;
}) {
  const n = (campo: string) => (nomeDoCampo ? nomeDoCampo(campo) : prefix ? `${prefix}.${campo}` : campo);
  const marca = watch(n('marca')) as string | undefined;
  const modelo = watch(n('modelo')) as string | undefined;
  const placa = watch(n('placa')) as string | undefined;
  const chassi = watch(n('chassi')) as string | undefined;

  // Nunca sobrescreve o que o usuário já digitou: só completa campos vazios.
  function aplicarDadosPlaca(dados: DadosPlaca) {
    const preencher = (campo: string, valor: string | number | null | undefined) => {
      if (valor == null || valor === '') return;
      const atual = watch(n(campo)) as unknown;
      if (atual != null && atual !== '') return;
      setValue(n(campo), valor, { shouldDirty: true, shouldValidate: !!estrito });
    };
    preencher('marca', dados.marca);
    preencher('modelo', dados.modelo);
    preencher('anoFabricacao', dados.anoFabricacao);
    preencher('anoModelo', dados.anoModelo);
    preencher('cor', dados.cor);
    preencher('chassi', dados.chassi);
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-12">
      {!ocultarPlaca && (
        <div className="col-span-2 lg:col-span-3">
          <Input label="Placa" required error={errors?.placa?.message} {...register(n('placa'))} />
          {consultaPlaca && <PlacaConsulta placa={placa} chassiPreenchido={!!chassi} onDados={aplicarDadosPlaca} />}
        </div>
      )}
      <ModeloVeiculoField
        className={ocultarPlaca ? 'col-span-2 lg:col-span-12' : 'col-span-2 lg:col-span-9 lg:self-end'}
        marca={marca}
        modelo={modelo}
        onSelecionar={(m) => {
          setValue(n('marca'), m.marca, { shouldDirty: true });
          setValue(n('modelo'), m.modelo, { shouldDirty: true, shouldValidate: !!estrito });
        }}
      />
      <div className="lg:col-span-3">
        <Input label="Marca" {...register(n('marca'))} />
      </div>
      <div className="lg:col-span-3">
        <Input label="Modelo" required={estrito} error={errors?.modelo?.message} {...register(n('modelo'))} />
      </div>
      <div className="lg:col-span-3">
        <Input label="Cor" required={estrito} error={errors?.cor?.message} {...register(n('cor'))} />
      </div>
      <div className="lg:col-span-3">
        <Select
          label="Categoria"
          required
          hint={estrito ? 'Define a hora técnica dos serviços' : undefined}
          error={errors?.categoria?.message}
          {...register(n('categoria'))}
        >
          {categoriaVazia && <option value="">Selecione a categoria</option>}
          {CATEGORIAS_COMPLEXIDADE.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="lg:col-span-3">
        <Input
          label="Ano de fabricação"
          type="number"
          required={estrito}
          error={errors?.anoFabricacao?.message}
          {...register(n('anoFabricacao'))}
        />
      </div>
      <div className="lg:col-span-3">
        <Input label="Ano do modelo" type="number" {...register(n('anoModelo'))} />
      </div>
      {!ocultarKm && (
        <div className="lg:col-span-3">
          <Input label="KM atual" type="number" {...register(n('kmAtual'))} />
        </div>
      )}
      <div className="lg:col-span-3">
        <Input label="Chassi" required={estrito} error={errors?.chassi?.message} {...register(n('chassi'))} />
      </div>
    </div>
  );
}
