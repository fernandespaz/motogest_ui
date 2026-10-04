import { describe, expect, it } from 'vitest';
import {
  configuracaoFiscalSchema,
  parseAliquota,
  pendenciaDaOficina,
  pendenciaDoCertificado,
  toFormValues,
  toRequest,
} from './configuracaoFiscal';

const vazio = toFormValues(undefined);

describe('parseAliquota', () => {
  it('accepts comma and dot decimals and treats blank/garbage as undefined', () => {
    expect(parseAliquota('6,5')).toBe(6.5);
    expect(parseAliquota('6.5')).toBe(6.5);
    expect(parseAliquota('0')).toBe(0);
    expect(parseAliquota('')).toBeUndefined();
    expect(parseAliquota('abc')).toBeUndefined();
  });
});

describe('configuracaoFiscalSchema', () => {
  it('lets an empty (incomplete) configuration through — pendências are the backend\'s job', () => {
    expect(configuracaoFiscalSchema.safeParse(vazio).success).toBe(true);
  });

  it.each([
    ['codigoMunicipioIbge', '530010'],
    ['codigoServico', '14010'],
    ['cnae', '123456'],
    ['aliquotaIss', '5,1'],
    ['aliquotaSimplesNacional', '100'],
  ])('rejects a malformed %s (%s)', (campo, valor) => {
    expect(configuracaoFiscalSchema.safeParse({ ...vazio, [campo]: valor }).success).toBe(false);
  });

  it('accepts the documented example values', () => {
    const r = configuracaoFiscalSchema.safeParse({
      ...vazio,
      codigoMunicipioIbge: '5300108',
      codigoServico: '140101',
      aliquotaSimplesNacional: '6,00',
    });
    expect(r.success).toBe(true);
  });
});

describe('toRequest', () => {
  const base = {
    ...vazio,
    regimeTributario: 'SIMPLES_NACIONAL',
    aliquotaIss: '2',
    aliquotaSimplesNacional: '6,5',
    inscricaoMunicipal: '  ',
  };

  it('sends only the alíquota that applies to the regime (Simples/MEI → simples, never ISS)', () => {
    const req = toRequest(base, { emissaoHabilitada: false, ambiente: 'HOMOLOGACAO' });
    expect(req.aliquotaSimplesNacional).toBe(6.5);
    expect(req.aliquotaIss).toBeUndefined();
  });

  it('sends ISS (and not the simples percentage) for Lucro Presumido', () => {
    const req = toRequest(
      { ...base, regimeTributario: 'LUCRO_PRESUMIDO' },
      { emissaoHabilitada: false, ambiente: 'HOMOLOGACAO' },
    );
    expect(req.aliquotaIss).toBe(2);
    expect(req.aliquotaSimplesNacional).toBeUndefined();
  });

  it('turns blank text into undefined and carries the habilitação + the backend-owned provedorEmpresaRef through', () => {
    const req = toRequest(base, { emissaoHabilitada: true, ambiente: 'PRODUCAO', provedorEmpresaRef: 'ref-1' });
    expect(req.inscricaoMunicipal).toBeUndefined();
    expect(req.emissaoHabilitada).toBe(true);
    expect(req.ambiente).toBe('PRODUCAO');
    expect(req.provedorEmpresaRef).toBe('ref-1');
  });
});

describe('pendência classifiers', () => {
  it('routes oficina-cadastro pendências to Minha Oficina and certificate ones elsewhere', () => {
    expect(pendenciaDaOficina('CNPJ da oficina invalido')).toBe(true);
    expect(pendenciaDaOficina('Certificado digital A1 (e-CNPJ) nao enviado')).toBe(false);
    expect(pendenciaDoCertificado('Certificado digital vencido em 01/01/2026')).toBe(true);
    expect(pendenciaDaOficina('Regime tributario nao informado')).toBe(false);
  });
});
