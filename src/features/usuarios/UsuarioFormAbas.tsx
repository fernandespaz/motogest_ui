import { useFormContext } from 'react-hook-form';
import { Checkbox, Input, Select } from '@/components/ui/Field';
import { SENHA_HINT } from '@/lib/senha';
import { formatCep, formatCpf, formatPhone } from '@/lib/formatters';
import { formatPis } from '@/lib/documentos';
import { MaskedField } from './MaskedField';
import { UfSelect } from './UfSelect';
import { Col, Grid, Secao } from './formLayout';
import { ESTADO_CIVIL_LABEL, SEXO_LABEL, TIPO_CONTRATO_LABEL } from './colaborador';
import type { FormValues } from './usuarioFormSchema';

function Opcoes({ rotulos }: { rotulos: Record<string, string> }) {
  return (
    <>
      <option value="">Selecione...</option>
      {Object.entries(rotulos).map(([valor, rotulo]) => (
        <option key={valor} value={valor}>
          {rotulo}
        </option>
      ))}
    </>
  );
}

export function AbaAcesso({ isEditing, perfis }: { isEditing: boolean; perfis?: { id?: number; nome?: string }[] }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();
  return (
    <>
      <Secao titulo="Quem é" descricao="Dados usados para entrar no sistema.">
        <Grid>
          <Col span={6}>
            <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
          </Col>
          <Col span={6}>
            <Input label="E-mail de acesso" type="email" required error={errors.email?.message} {...register('email')} />
          </Col>
          <Col span={6}>
            <Select label="Perfil de acesso" required error={errors.perfilId?.message} {...register('perfilId')}>
              <option value={0}>Selecione...</option>
              {perfis?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </Col>
          {isEditing && (
            <Col span={6} className="sm:self-end sm:pb-2.5">
              <Checkbox label="Usuário ativo" {...register('ativo')} />
            </Col>
          )}
        </Grid>
      </Secao>
      <Secao titulo={isEditing ? 'Alterar senha' : 'Senha'}>
        <Grid>
          <Col span={6}>
            <Input
              label={isEditing ? 'Nova senha' : 'Senha'}
              type="password"
              hint={isEditing ? 'Deixe em branco para manter a senha atual' : SENHA_HINT}
              error={errors.senha?.message}
              required={!isEditing}
              {...register('senha')}
            />
          </Col>
          <Col span={6}>
            <Input
              label={isEditing ? 'Confirmar nova senha' : 'Confirmar senha'}
              type="password"
              error={errors.confirmacaoSenha?.message}
              required={!isEditing}
              {...register('confirmacaoSenha')}
            />
          </Col>
        </Grid>
      </Secao>
    </>
  );
}

export function AbaPessoais() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();
  return (
    <>
      <Secao titulo="Identificação">
        <Grid>
          <Col span={3}>
            <Input label="Data de nascimento" type="date" error={errors.dataNascimento?.message} {...register('dataNascimento')} />
          </Col>
          <Col span={3}>
            <Select label="Sexo" {...register('sexo')}>
              <Opcoes rotulos={SEXO_LABEL} />
            </Select>
          </Col>
          <Col span={3}>
            <Select label="Estado civil" {...register('estadoCivil')}>
              <Opcoes rotulos={ESTADO_CIVIL_LABEL} />
            </Select>
          </Col>
          <Col span={3}>
            <Input label="Nacionalidade" autoComplete="off" {...register('nacionalidade')} />
          </Col>
          <Col span={9}>
            <Input label="Naturalidade (cidade)" autoComplete="off" {...register('naturalidade')} />
          </Col>
          <Col span={3}>
            <UfSelect label="UF" aria-label="UF da naturalidade" error={errors.naturalidadeUf?.message} {...register('naturalidadeUf')} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Filiação">
        <Grid>
          <Col span={6}>
            <Input label="Nome da mãe" autoComplete="off" {...register('nomeMae')} />
          </Col>
          <Col span={6}>
            <Input label="Nome do pai" autoComplete="off" {...register('nomePai')} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Documentos">
        <Grid>
          <Col span={4}>
            <MaskedField control={control} name="cpf" label="CPF" format={formatCpf} error={errors.cpf?.message} />
          </Col>
          <Col span={4}>
            <MaskedField control={control} name="pisPasep" label="PIS/PASEP" format={formatPis} error={errors.pisPasep?.message} />
          </Col>
          <Col span={4}>
            <Input label="Título de eleitor" inputMode="numeric" autoComplete="off" {...register('tituloEleitor')} />
          </Col>
          <Col span={4}>
            <Input label="RG" autoComplete="off" {...register('rg')} />
          </Col>
          <Col span={3}>
            <Input label="Órgão emissor" autoComplete="off" {...register('rgOrgaoEmissor')} />
          </Col>
          <Col span={2}>
            <UfSelect label="UF" aria-label="UF do RG" error={errors.rgUf?.message} {...register('rgUf')} />
          </Col>
          <Col span={3}>
            <Input label="Emissão" type="date" {...register('rgDataEmissao')} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Carteira de trabalho (CTPS)">
        <Grid>
          <Col span={4}>
            <Input label="Número" autoComplete="off" {...register('ctpsNumero')} />
          </Col>
          <Col span={4}>
            <Input label="Série" autoComplete="off" {...register('ctpsSerie')} />
          </Col>
          <Col span={4}>
            <UfSelect label="UF" aria-label="UF da CTPS" error={errors.ctpsUf?.message} {...register('ctpsUf')} />
          </Col>
        </Grid>
      </Secao>
    </>
  );
}

export function AbaContato({ buscandoCep, onCepBlur }: { buscandoCep: boolean; onCepBlur: (cep: string) => void }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();
  return (
    <>
      <Secao titulo="Contato">
        <Grid>
          <Col span={6}>
            <Input label="E-mail pessoal" type="email" error={errors.emailPessoal?.message} {...register('emailPessoal')} />
          </Col>
          <Col span={3}>
            <MaskedField control={control} name="telefone" label="Telefone" format={formatPhone} />
          </Col>
          <Col span={3}>
            <MaskedField control={control} name="celular" label="Celular / WhatsApp" format={formatPhone} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Endereço" descricao="Digite o CEP para preencher rua, bairro e cidade automaticamente.">
        <Grid>
          <Col span={3}>
            <MaskedField
              control={control}
              name="cep"
              label="CEP"
              format={formatCep}
              error={errors.cep?.message}
              hint={buscandoCep ? 'Buscando endereço...' : undefined}
              onBlur={(e) => onCepBlur(e.target.value)}
            />
          </Col>
          <Col span={9}>
            <Input label="Logradouro" autoComplete="off" {...register('logradouro')} />
          </Col>
          <Col span={3}>
            <Input label="Número" autoComplete="off" {...register('numero')} />
          </Col>
          <Col span={9}>
            <Input label="Complemento" autoComplete="off" {...register('complemento')} />
          </Col>
          <Col span={5}>
            <Input label="Bairro" autoComplete="off" {...register('bairro')} />
          </Col>
          <Col span={4}>
            <Input label="Cidade" autoComplete="off" {...register('cidade')} />
          </Col>
          <Col span={3}>
            <UfSelect error={errors.uf?.message} {...register('uf')} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Contato de emergência" descricao="Quem avisar em caso de acidente ou imprevisto.">
        <Grid>
          <Col span={5}>
            <Input label="Nome" autoComplete="off" {...register('contatoEmergenciaNome')} />
          </Col>
          <Col span={3}>
            <Input label="Parentesco" autoComplete="off" {...register('contatoEmergenciaParentesco')} />
          </Col>
          <Col span={4}>
            <MaskedField control={control} name="contatoEmergenciaTelefone" label="Telefone" format={formatPhone} />
          </Col>
        </Grid>
      </Secao>
    </>
  );
}

export function AbaContratacao() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();
  return (
    <>
      <Secao titulo="Função">
        <Grid>
          <Col span={6}>
            <Input label="Cargo / função" autoComplete="off" {...register('cargo')} />
          </Col>
          <Col span={3}>
            <Input label="CBO" inputMode="numeric" maxLength={6} hint="6 dígitos" error={errors.cbo?.message} {...register('cbo')} />
          </Col>
          <Col span={3}>
            <Input label="Matrícula" autoComplete="off" {...register('matricula')} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Contrato">
        <Grid>
          <Col span={4}>
            <Input label="Data de admissão" type="date" {...register('dataAdmissao')} />
          </Col>
          <Col span={4}>
            <Select label="Tipo de contrato" {...register('tipoContrato')}>
              <Opcoes rotulos={TIPO_CONTRATO_LABEL} />
            </Select>
          </Col>
          <Col span={4}>
            <Input label="Fim do contrato" type="date" hint="Experiência ou prazo determinado" {...register('dataFimContrato')} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Jornada e remuneração">
        <Grid>
          <Col span={4}>
            <Input
              label="Jornada semanal (horas)"
              type="number"
              min={1}
              max={44}
              hint="Máximo de 44h pela CLT"
              error={errors.jornadaSemanalHoras?.message}
              {...register('jornadaSemanalHoras')}
            />
          </Col>
          <Col span={4}>
            <Input label="Salário (R$)" type="number" step="0.01" min={0} error={errors.salario?.message} {...register('salario')} />
          </Col>
        </Grid>
      </Secao>

      <Secao titulo="Desligamento" descricao="Preencha só quando o vínculo for encerrado.">
        <Grid>
          <Col span={4}>
            <Input label="Data de demissão" type="date" error={errors.dataDemissao?.message} {...register('dataDemissao')} />
          </Col>
        </Grid>
      </Secao>
    </>
  );
}
