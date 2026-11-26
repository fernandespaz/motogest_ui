import { useState } from 'react';
import type { ReactNode } from 'react';
import { get, type FieldErrors, type UseFormRegister, type UseFormWatch } from 'react-hook-form';
import { CheckCircle2, Eye, EyeOff, Loader2, Pencil, PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { CATEGORIAS_COMPLEXIDADE } from '@/lib/categoria';
import { mascararChassi } from '@/lib/chassi';
import { formatCentavos } from '@/lib/formatters';
import type { usePlacaConsulta, DadosPlaca } from '@/features/shared/usePlacaConsulta';

/** Campos do veículo que a consulta pode devolver (o que o backend entrega hoje). */
type CampoConsulta = keyof DadosPlaca;

const CAMPOS: { campo: CampoConsulta; label: string; type?: 'number'; required?: boolean }[] = [
  { campo: 'marca', label: 'Marca' },
  { campo: 'modelo', label: 'Modelo', required: true },
  { campo: 'anoFabricacao', label: 'Ano de fabricação', type: 'number' },
  { campo: 'anoModelo', label: 'Ano do modelo', type: 'number' },
  { campo: 'cor', label: 'Cor' },
  { campo: 'chassi', label: 'Chassi' },
];

function OrigemBadge({ origem }: { origem: 'consulta' | 'manual' }) {
  return origem === 'consulta' ? (
    <Badge tone="success">
      <CheckCircle2 size={12} aria-hidden="true" /> Consulta
    </Badge>
  ) : (
    <Badge tone="warning">
      <Pencil size={12} aria-hidden="true" /> Manual
    </Badge>
  );
}

function CampoComOrigem({
  label,
  required,
  origem,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  origem: 'consulta' | 'manual';
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">
          {label} {required && <span className="text-danger">*</span>}
        </span>
        <span className="flex items-center gap-1">
          {action}
          <OrigemBadge origem={origem} />
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * Seção de validação do cadastro de veículo: depois de uma consulta de placa
 * bem-sucedida, separa o que veio da integração (✅, travado por padrão) do
 * que o usuário ainda precisa completar (✏️). Cada campo mostra sua origem; um
 * dado da consulta que o usuário corrige passa a aparecer como "Manual".
 */
export function VeiculoDadosValidacao({
  placa,
  dadosConsulta,
  register,
  watch,
  errors,
  consulta,
  nomeDoCampo = (campo) => campo,
  semKmEObservacoes,
}: {
  /** Nome do campo no form: o rascunho de orçamento chama a marca de "veiculoMarca", e assim por diante. */
  nomeDoCampo?: (campo: string) => string;
  /** KM e observações são do cadastro do veículo; o rascunho de orçamento não os guarda. */
  semKmEObservacoes?: boolean;
  placa: string;
  /** Campos que a consulta de fato devolveu (null/ausente = não retornado). */
  dadosConsulta: Partial<DadosPlaca>;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors<any>;
  consulta: ReturnType<typeof usePlacaConsulta>;
}) {
  const [editando, setEditando] = useState(false);
  const [chassiVisivel, setChassiVisivel] = useState(false);

  const retornados = CAMPOS.filter((c) => dadosConsulta[c.campo] != null && dadosConsulta[c.campo] !== '');
  const faltantes = CAMPOS.filter((c) => !retornados.includes(c));
  const chassiRetornado = retornados.some((c) => c.campo === 'chassi');

  const origemDe = (campo: CampoConsulta): 'consulta' | 'manual' => {
    const atual = watch(nomeDoCampo(campo)) as unknown;
    return String(atual ?? '') === String(dadosConsulta[campo] ?? '') ? 'consulta' : 'manual';
  };
  // get() entende nomes aninhados ("veiculosNovos.0.marca") além dos simples.
  const erro = (campo: string) => (get(errors, nomeDoCampo(campo))?.message as string | undefined);

  return (
    <div className="flex flex-col gap-6">
      {retornados.length > 0 && (
        <section aria-label="Informações encontradas na consulta da placa" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle2 size={16} className="text-green-600" aria-hidden="true" />
              Informações encontradas na consulta da placa
            </h3>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditando((v) => !v)}>
              <PencilLine size={14} /> {editando ? 'Travar dados' : 'Corrigir dados'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <CampoComOrigem label="Placa" origem="consulta">
              <Input aria-label="Placa consultada" value={placa} readOnly />
            </CampoComOrigem>

            {retornados.map(({ campo, label, type, required }) =>
              campo === 'chassi' ? (
                <CampoComOrigem
                  key={campo}
                  label={label}
                  required={required}
                  origem={origemDe(campo)}
                  action={
                    !editando && (
                      <button
                        type="button"
                        onClick={() => setChassiVisivel((v) => !v)}
                        className="text-ink-muted hover:text-ink"
                        aria-label={chassiVisivel ? 'Ocultar chassi' : 'Mostrar chassi'}
                      >
                        {chassiVisivel ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )
                  }
                >
                  {editando || chassiVisivel ? (
                    <Input aria-label={label} readOnly={!editando && !erro(campo)} error={erro(campo)} {...register(nomeDoCampo(campo))} />
                  ) : (
                    <Input aria-label={label} value={mascararChassi(String(watch(nomeDoCampo(campo)) ?? ''))} readOnly />
                  )}
                </CampoComOrigem>
              ) : (
                <CampoComOrigem key={campo} label={label} required={required} origem={origemDe(campo)}>
                  <Input aria-label={label} type={type} readOnly={!editando && !erro(campo)} error={erro(campo)} {...register(nomeDoCampo(campo))} />
                </CampoComOrigem>
              ),
            )}
          </div>
        </section>
      )}

      <section aria-label="Informações complementares necessárias" className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-ink">
          <PencilLine size={16} className="text-amber-600" aria-hidden="true" />
          Informações complementares necessárias
        </h3>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {faltantes.map(({ campo, label, type, required }) => (
            <CampoComOrigem
              key={campo}
              label={label}
              required={required}
              origem="manual"
              action={
                campo === 'chassi' &&
                !chassiRetornado &&
                consulta.disponivel &&
                consulta.resultado?.encontrada &&
                !consulta.resultado.placaJaCadastrada &&
                consulta.carteira && (
                  <Button type="button" size="sm" variant="ghost" disabled={consulta.ocupado} onClick={consulta.buscarChassi}>
                    {consulta.buscandoChassi && <Loader2 size={12} className="animate-spin" />}
                    Buscar ({formatCentavos(consulta.carteira.precoChassiCentavos)})
                  </Button>
                )
              }
            >
              <Input aria-label={label} type={type} error={erro(campo)} {...register(nomeDoCampo(campo))} />
            </CampoComOrigem>
          ))}

          <CampoComOrigem label="Categoria" required origem="manual">
            <Select aria-label="Categoria" error={erro('categoria')} hint="Define a hora técnica dos serviços" {...register(nomeDoCampo('categoria'))}>
              <option value="">Selecione a categoria</option>
              {CATEGORIAS_COMPLEXIDADE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </CampoComOrigem>

          {!semKmEObservacoes && (
            <CampoComOrigem label="KM atual" origem="manual">
              <Input aria-label="KM atual" type="number" {...register(nomeDoCampo('kmAtual'))} />
            </CampoComOrigem>
          )}
        </div>

        {!semKmEObservacoes && <Textarea label="Observações" rows={2} {...register(nomeDoCampo('observacoes'))} />}
      </section>
    </div>
  );
}
