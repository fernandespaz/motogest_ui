/** Unidades de medida comuns para peças/insumos de oficina — usadas no dropdown do formulário de produto. */
export const PRODUTO_UNIDADE_LABELS: Record<string, string> = {
  UN: 'Unidade (UN)',
  PC: 'Peça (PC)',
  PAR: 'Par (PAR)',
  JG: 'Jogo/Kit (JG)',
  CX: 'Caixa (CX)',
  L: 'Litro (L)',
  ML: 'Mililitro (ML)',
  KG: 'Quilograma (KG)',
  G: 'Grama (G)',
  M: 'Metro (M)',
  CM: 'Centímetro (CM)',
  RL: 'Rolo (RL)',
  FR: 'Frasco (FR)',
  GL: 'Galão (GL)',
};

export const PRODUTO_UNIDADES = Object.keys(PRODUTO_UNIDADE_LABELS);
