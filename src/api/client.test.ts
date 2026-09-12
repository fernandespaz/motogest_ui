import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiForbiddenError, extractErrorMessage } from './client';

function makeAxiosError(data: unknown, status = 400): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = { data, status, statusText: '', headers: {}, config: error.config! } as never;
  return error;
}

describe('extractErrorMessage', () => {
  it('reads the backend "message" field first', () => {
    expect(extractErrorMessage(makeAxiosError({ message: 'Cliente já cadastrado' }))).toBe('Cliente já cadastrado');
  });

  it('falls back to "erro" then "error" fields', () => {
    expect(extractErrorMessage(makeAxiosError({ erro: 'Falha ao processar' }))).toBe('Falha ao processar');
    expect(extractErrorMessage(makeAxiosError({ error: 'Bad request' }))).toBe('Bad request');
  });

  it('uses the fallback message when the response has no recognizable field', () => {
    expect(extractErrorMessage(makeAxiosError({}), 'Erro genérico')).toBe('Erro genérico');
  });

  it('returns the ApiForbiddenError message directly', () => {
    expect(extractErrorMessage(new ApiForbiddenError())).toBe('Você não tem permissão para executar esta ação.');
  });

  it('returns a plain Error message', () => {
    expect(extractErrorMessage(new Error('Falha de rede'))).toBe('Falha de rede');
  });

  it('returns the default fallback for a completely unknown error shape', () => {
    expect(extractErrorMessage('string-thrown')).toBe('Ocorreu um erro inesperado.');
    expect(extractErrorMessage(null)).toBe('Ocorreu um erro inesperado.');
  });
});
