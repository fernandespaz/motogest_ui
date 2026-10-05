import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Input, Select } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { FuelGauge } from '@/features/shared/FuelGauge';
import type { VistaAvaria } from '@/api/types';
import { MAX_AVARIAS, MAX_DESCRICAO, type AvariaForm } from './avarias';
import { CARROCERIAS, ROTULO_CARROCERIA, inferirCarroceria, type Carroceria } from './carroceria';
import { ViewerErrorBoundary } from './ViewerErrorBoundary';
import type { PedidoVista, PinAvaria } from './VistoriaViewer';
import type { ToqueNoModelo } from './VeiculoModelo';
import {
  COR_TIPO,
  ROTULO_TIPO,
  ROTULO_VISTA,
  ROTULO_ZONA,
  TIPOS,
  VISTAS,
  ZONAS,
  arredondar,
  vistaDaNormal,
  zonaSugerida,
} from './zonas';

// Carregado sob demanda: three.js + o .glb pesam mais que o resto da tela de orçamento junta.
const VistoriaViewer = lazy(() => import('./VistoriaViewer'));

// Colunas da linha de cada avaria no desktop: nº · região · tipo · detalhes · remover. O cabeçalho usa
// a mesma grade pra os títulos ficarem alinhados com os campos.
const COLUNAS_DESKTOP = (somenteLeitura?: boolean) =>
  somenteLeitura
    ? 'sm:grid-cols-[1.5rem_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,2fr)]'
    : 'sm:grid-cols-[1.5rem_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,2fr)_2.25rem]';

/** Subconjunto do form do orçamento que a vistoria lê e escreve. */
interface VistoriaFormValues {
  nivelCombustivel?: number;
  avarias: AvariaForm[];
}

interface VistoriaEntradaProps {
  veiculo?: { id?: number; marca?: string | null; modelo?: string | null };
  readOnly?: boolean;
}

function ViewerIndisponivel() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-muted">
      Não foi possível exibir o modelo 3D agora (aparelho sem suporte ou sem conexão). Registre as avarias pela lista abaixo.
    </div>
  );
}

export function VistoriaEntrada({ veiculo, readOnly }: VistoriaEntradaProps) {
  const { control, register, watch } = useFormContext<VistoriaFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'avarias' });
  const avarias = watch('avarias') ?? [];

  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [pedidoVista, setPedidoVista] = useState<PedidoVista | undefined>();
  const [escolhaCarroceria, setEscolhaCarroceria] = useState<{ veiculoId?: number; valor: Carroceria }>();
  const [indiceParaFocar, setIndiceParaFocar] = useState<number | null>(null);

  // A carroceria ainda não vem do cadastro, então é inferida pelo modelo; a escolha
  // manual vale só pro veículo em que foi feita (trocar de veículo volta pro palpite).
  const inferida = inferirCarroceria(veiculo?.marca, veiculo?.modelo);
  const carroceria = escolhaCarroceria && escolhaCarroceria.veiculoId === veiculo?.id ? escolhaCarroceria.valor : inferida;

  const pins = useMemo<PinAvaria[]>(
    () =>
      avarias.flatMap((a, indice) =>
        a?.posicao && a.tipo ? [{ indice, tipo: a.tipo, posicao: a.posicao, vista: a.vista }] : [],
      ),
    [avarias],
  );

  const limiteAtingido = fields.length >= MAX_AVARIAS;

  useEffect(() => {
    if (indiceParaFocar === null) return;
    const campo = document.getElementById(`avaria-tipo-${indiceParaFocar}`);
    campo?.focus();
    campo?.scrollIntoView?.({ block: 'nearest' });
    setIndiceParaFocar(null);
  }, [indiceParaFocar]);

  function marcar({ ponto, normal }: ToqueNoModelo) {
    if (readOnly || limiteAtingido) return;
    append({
      zona: zonaSugerida(ponto, normal),
      tipo: 'ARRANHAO',
      vista: vistaDaNormal(normal),
      posicao: arredondar(ponto),
    });
    setSelecionada(fields.length);
    setIndiceParaFocar(fields.length);
  }

  function adicionarSemMarcar() {
    if (limiteAtingido) return;
    append({ zona: 'OUTRA', tipo: 'OUTRO' });
    setSelecionada(fields.length);
    setIndiceParaFocar(fields.length);
  }

  function remover(indice: number) {
    remove(indice);
    setSelecionada((atual) => {
      if (atual === null || atual === indice) return null;
      return atual > indice ? atual - 1 : atual;
    });
  }

  function irParaVista(vista: VistaAvaria) {
    setPedidoVista((p) => ({ vista, nonce: (p?.nonce ?? 0) + 1 }));
  }

  return (
    <section aria-labelledby="vistoria-titulo" className="mt-4 rounded-lg border border-border bg-surface-alt p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="vistoria-titulo" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Vistoria de entrada
          </h3>
          <p className="text-xs text-ink-muted">
            {readOnly
              ? 'Gire o veículo e toque nos pontos para ver as avarias registradas.'
              : 'Gire o veículo e toque no ponto exato de cada avaria ou detalhe.'}
          </p>
        </div>
        <div role="radiogroup" aria-label="Carroceria do veículo" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {CARROCERIAS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={carroceria === c}
              onClick={() => setEscolhaCarroceria({ veiculoId: veiculo?.id, valor: c })}
              className={clsx(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                carroceria === c ? 'bg-brand-600 text-white' : 'text-ink-muted hover:text-ink',
              )}
            >
              {ROTULO_CARROCERIA[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="relative h-[320px] overflow-hidden rounded-lg border border-border bg-surface sm:h-[400px]">
            <ViewerErrorBoundary key={carroceria} fallback={<ViewerIndisponivel />}>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-ink-muted">
                    <Spinner /> <span className="ml-2">Carregando modelo 3D…</span>
                  </div>
                }
              >
                <VistoriaViewer
                  carroceria={carroceria}
                  pins={pins}
                  selecionada={selecionada}
                  pedidoVista={pedidoVista}
                  somenteLeitura={readOnly || limiteAtingido}
                  onToque={marcar}
                  onSelecionar={setSelecionada}
                />
              </Suspense>
            </ViewerErrorBoundary>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Vistas do veículo">
            {VISTAS.map((v) => (
              <Button key={v} type="button" size="sm" variant="secondary" onClick={() => irParaVista(v)}>
                {ROTULO_VISTA[v]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-surface p-3">
            <Controller
              name="nivelCombustivel"
              control={control}
              render={({ field }) => (
                <FuelGauge label="Combustível na entrada" value={field.value} onChange={field.onChange} disabled={readOnly} />
              )}
            />
          </div>
          <ul aria-label="Legenda dos tipos de avaria" className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-border bg-surface p-3">
            {TIPOS.map((t) => (
              <li key={t} className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COR_TIPO[t] }} aria-hidden="true" />
                {ROTULO_TIPO[t]}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">
            Avarias registradas <span className="font-normal text-ink-muted">({fields.length})</span>
          </p>
          {!readOnly && (
            <Button type="button" size="sm" variant="outline" className="whitespace-nowrap" onClick={adicionarSemMarcar} disabled={limiteAtingido}>
              <Plus size={14} /> Adicionar manual
            </Button>
          )}
        </div>
        {limiteAtingido && !readOnly && (
          <p className="mb-2 text-xs text-warning">Limite de {MAX_AVARIAS} avarias por orçamento atingido.</p>
        )}

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-4 text-center text-sm text-ink-muted">
            {readOnly ? 'Nenhuma avaria registrada na entrada.' : 'Nenhuma avaria registrada. Toque no veículo para marcar a primeira.'}
          </p>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={clsx(
                COLUNAS_DESKTOP(readOnly),
                'mb-1 hidden gap-2 px-[calc(0.5rem+1px)] text-[11px] font-semibold uppercase tracking-wide text-ink-muted sm:grid',
              )}
            >
              <span className="w-6" />
              <span>Região</span>
              <span>Tipo</span>
              <span>Detalhes</span>
              {!readOnly && <span className="w-9" />}
            </div>
            <ul className="flex max-h-[19rem] flex-col gap-1.5 overflow-y-auto pr-1">
              {fields.map((campo, i) => {
                const tipo = avarias[i]?.tipo ?? 'OUTRO';
                const ativa = selecionada === i;
                return (
                  <li
                    key={campo.id}
                    className={clsx(
                      COLUNAS_DESKTOP(readOnly),
                      'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-surface p-2 transition-colors',
                      ativa ? 'border-brand-400 ring-1 ring-brand-300' : 'border-border',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelecionada(ativa ? null : i)}
                      aria-label={`Destacar avaria ${i + 1} no modelo`}
                      aria-pressed={ativa}
                      className="col-start-1 row-start-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:col-start-auto sm:row-start-auto"
                      style={{ background: COR_TIPO[tipo] }}
                    >
                      {i + 1}
                    </button>
                    <div className="col-start-2 row-start-1 min-w-0 sm:col-start-auto sm:row-start-auto">
                      <Select
                        aria-label={`Região da avaria ${i + 1}`}
                        disabled={readOnly}
                        className="!h-9"
                        {...register(`avarias.${i}.zona`)}
                      >
                        {ZONAS.map((z) => (
                          <option key={z} value={z}>
                            {ROTULO_ZONA[z]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-2 col-start-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
                      <Select
                        id={`avaria-tipo-${i}`}
                        aria-label={`Tipo da avaria ${i + 1}`}
                        disabled={readOnly}
                        className="!h-9"
                        {...register(`avarias.${i}.tipo`)}
                      >
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>
                            {ROTULO_TIPO[t]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-2 col-start-2 row-start-3 min-w-0 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
                      <Input
                        aria-label={`Detalhes da avaria ${i + 1}`}
                        placeholder="Detalhes (opcional)"
                        maxLength={MAX_DESCRICAO}
                        disabled={readOnly}
                        className="!h-9"
                        {...register(`avarias.${i}.descricao`)}
                      />
                    </div>
                    {!readOnly && (
                      <IconActionButton
                        icon={Trash}
                        label={`Remover avaria ${i + 1}`}
                        tone="danger"
                        iconSize={16}
                        onClick={() => remover(i)}
                        className="col-start-3 row-start-1 !h-9 !w-9 sm:col-start-auto sm:row-start-auto"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
