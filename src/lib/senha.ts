// Espelha SenhaForteValidator do backend (motogest_api): mínimo de 8
// caracteres, ao menos uma letra maiúscula e um caractere especial (nem
// letra, nem dígito, nem espaço). Manter as duas pontas iguais evita o
// usuário passar na validação do form e tomar 400 do servidor.
export const SENHA_TAMANHO_MINIMO = 8;

export const SENHA_FRACA_MSG = `Senha fraca: use no mínimo ${SENHA_TAMANHO_MINIMO} caracteres, com letra maiúscula e caractere especial`;
export const SENHA_NAO_CONFERE_MSG = 'A confirmação de senha não confere com a senha';
export const SENHA_HINT = `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres, com letra maiúscula e caractere especial`;

export function isSenhaForte(senha: string): boolean {
  return (
    senha.length >= SENHA_TAMANHO_MINIMO && /\p{Lu}/u.test(senha) && /[^\p{L}\p{Nd}\s]/u.test(senha)
  );
}
