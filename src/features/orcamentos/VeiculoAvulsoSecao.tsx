import { VeiculoComConsulta } from '@/features/shared/VeiculoComConsulta';

/** Nome de cada campo do veículo no formulário do orçamento (o rascunho guarda tudo como "veiculoX"). */
const CAMPOS_NO_FORM: Record<string, string> = {
  placa: 'veiculoPlaca',
  marca: 'veiculoMarca',
  modelo: 'veiculoModelo',
  anoFabricacao: 'veiculoAnoFabricacao',
  anoModelo: 'veiculoAnoModelo',
  cor: 'veiculoCor',
  chassi: 'veiculoChassi',
  categoria: 'veiculoCategoria',
};
export const nomeDoCampoVeiculo = (campo: string) => CAMPOS_NO_FORM[campo] ?? campo;

/**
 * Veículo do orçamento "ainda não cadastrado": a mesma experiência do cadastro de veículo, só que gravando no
 * próprio rascunho. Assim, ao "Concluir cadastro", nada precisa ser digitado de novo.
 */
export function VeiculoAvulsoSecao() {
  return <VeiculoComConsulta nomeDoCampo={nomeDoCampoVeiculo} ocultarKm semKmEObservacoes categoriaVazia />;
}
