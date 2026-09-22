import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Car, ImagePlus, Plus, Search, Upload, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useCreateModeloVeiculo, useModelosVeiculo } from '@/hooks/useModelosVeiculo';
import { useVeiculos } from '@/hooks/useVeiculos';
import type { ModeloVeiculoResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const IMAGEM_TIPOS_ACEITOS = ['image/png', 'image/jpeg'];
const IMAGEM_TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5MB — mesmo limite do backend

/** O back-end devolve o base64 puro (sem o prefixo data:), então o front monta a data URL. */
function imagemSrc(base64?: string | null): string | undefined {
  if (!base64) return undefined;
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

export function ModeloVeiculoThumb({ base64, size = 36 }: { base64?: string | null; size?: number }) {
  const src = imagemSrc(base64);
  const style = { height: size, width: size };
  if (src) {
    return <img src={src} alt="" style={style} className="shrink-0 rounded-md object-cover" />;
  }
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-muted">
      <Car size={size * 0.55} />
    </div>
  );
}

function ModeloVeiculoCatalogModal({
  open,
  onClose,
  buscaInicial,
  onSelecionar,
}: {
  open: boolean;
  onClose: () => void;
  buscaInicial: string;
  onSelecionar: (modelo: ModeloVeiculoResponse) => void;
}) {
  const [busca, setBusca] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const [novaMarca, setNovaMarca] = useState('');
  const [novoModelo, setNovoModelo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catálogos de marca/modelo costumam ser pequenos (dezenas de entradas) —
  // busca uma página generosa uma vez e filtra marca+modelo no cliente, em
  // vez de inventar um parâmetro combinado que o back-end não tem (ele só
  // filtra por "marca").
  // silentError: se faltar permissão pro catálogo, prefere deixar a lista
  // vazia (e o botão de "Cadastrar novo modelo" segue funcionando, com seu
  // próprio toast de erro específico) a interromper com um toast genérico
  // só de abrir o seletor.
  const { data, isLoading } = useModelosVeiculo({ size: 100 }, { enabled: open, silentError: true });
  const criar = useCreateModeloVeiculo();

  useEffect(() => {
    if (open) {
      setBusca(buscaInicial);
      setCadastrando(false);
      setNovaMarca('');
      setNovoModelo('');
      setArquivo(null);
      setPreview(null);
    }
  }, [open, buscaInicial]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const termo = busca.trim().toLowerCase();
  const filtrados = (data?.content ?? []).filter((m) =>
    termo ? `${m.marca ?? ''} ${m.modelo ?? ''}`.toLowerCase().includes(termo) : true,
  );

  function fechar() {
    onClose();
  }

  function abrirCadastro() {
    setCadastrando(true);
    // A busca já digitada costuma ser o modelo que o mecânico está
    // procurando — poupa ele de retypar na hora de cadastrar.
    if (!novoModelo) setNovoModelo(busca.trim());
  }

  function handleArquivoSelecionado(e: ChangeEvent<HTMLInputElement>) {
    const selecionado = e.target.files?.[0];
    e.target.value = '';
    if (!selecionado) return;

    if (!IMAGEM_TIPOS_ACEITOS.includes(selecionado.type)) {
      toast.error('Envie uma imagem PNG ou JPEG.');
      return;
    }
    if (selecionado.size > IMAGEM_TAMANHO_MAXIMO) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setArquivo(selecionado);
    setPreview(URL.createObjectURL(selecionado));
  }

  const podeCriar = novaMarca.trim() !== '' && novoModelo.trim() !== '';

  async function handleCriar() {
    if (!podeCriar) return;
    try {
      const criado = await criar.mutateAsync({
        marca: novaMarca.trim(),
        modelo: novoModelo.trim(),
        arquivo: arquivo ?? undefined,
      });
      toast.success('Modelo cadastrado no catálogo.');
      onSelecionar(criado);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível cadastrar o modelo.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={cadastrando ? 'Cadastrar novo modelo' : 'Modelo do veículo'}
      size="md"
      footer={
        cadastrando ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setCadastrando(false)} disabled={criar.isPending}>
              Voltar
            </Button>
            <Button type="button" onClick={handleCriar} loading={criar.isPending} disabled={!podeCriar}>
              Cadastrar e usar
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={fechar}>
            Fechar
          </Button>
        )
      }
    >
      {!cadastrando ? (
        <div className="flex flex-col gap-3">
          <Input
            icon={Search}
            placeholder="Buscar marca ou modelo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />

          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filtrados.length === 0 ? (
              <EmptyState
                icon={Car}
                title="Nenhum modelo encontrado"
                description="Cadastre esse modelo no catálogo pra reaproveitar (com imagem) nos próximos veículos."
                action={
                  <Button type="button" size="sm" onClick={abrirCadastro}>
                    <Plus size={14} /> Cadastrar novo modelo
                  </Button>
                }
              />
            ) : (
              filtrados.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => onSelecionar(m)}
                  className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-surface-alt"
                >
                  <ModeloVeiculoThumb base64={m.imagemBase64} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{m.marca}</p>
                    <p className="truncate text-xs text-ink-muted">{m.modelo}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {filtrados.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={abrirCadastro}>
              <Plus size={14} /> Cadastrar novo modelo
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Marca" required value={novaMarca} onChange={(e) => setNovaMarca(e.target.value)} />
            <Input label="Modelo" required value={novoModelo} onChange={(e) => setNovoModelo(e.target.value)} />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Imagem</p>
            <div className="flex items-center gap-3">
              {preview ? (
                <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-muted">
                  <ImagePlus size={20} />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleArquivoSelecionado}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> Enviar imagem
              </Button>
              {preview && (
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(preview);
                    setPreview(null);
                    setArquivo(null);
                  }}
                  aria-label="Remover imagem selecionada"
                  className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/30"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">Opcional — PNG ou JPEG, até 5MB.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Melhor esforço: casa marca+modelo já digitados com uma entrada do catálogo
 * (veículo antigo, cadastrado antes dessa tela existir, ou editado por fora)
 * pra mostrar a miniatura mesmo sem o usuário ter escolhido nesta sessão. O
 * veículo em si não guarda o vínculo — não existe id de modelo salvo nele —
 * então esse casamento é só por texto, puramente visual (nunca persistido).
 * undefined = ainda resolvendo/não tentou, null = resolvido sem achar, string = achou.
 */
export function useModeloVeiculoImagem(marca: string | undefined, modelo: string | undefined) {
  const [resolvido, setResolvido] = useState<string | null | undefined>(undefined);
  const termo = marca?.trim();
  const { data: candidatos } = useModelosVeiculo(
    { marca: termo, size: 20 },
    // silentError: é só uma miniatura decorativa — se o perfil não tiver
    // permissão pro catálogo (ou a busca falhar por qualquer motivo), a tela
    // não deve interromper o usuário com um toast por causa disso.
    { enabled: !!termo && !!modelo && resolvido === undefined, silentError: true },
  );

  useEffect(() => {
    setResolvido(undefined);
  }, [marca, modelo]);

  useEffect(() => {
    if (resolvido !== undefined || !candidatos || !modelo) return;
    const match = candidatos.content?.find(
      (m) => (m.marca ?? '').toLowerCase() === (marca ?? '').toLowerCase() && (m.modelo ?? '').toLowerCase() === modelo.toLowerCase(),
    );
    setResolvido(match?.imagemBase64 ?? null);
  }, [candidatos, marca, modelo, resolvido]);

  return resolvido;
}

/**
 * Pra listagens de Orçamento/OS: essas telas só recebem veiculoId+veiculoPlaca
 * (o back-end não devolve marca/modelo/imagem junto do orçamento ou da OS),
 * então resolver a miniatura exige o salto veiculoId -> veículo (marca/modelo)
 * -> catálogo (imagem). Busca os veículos e o catálogo inteiros uma vez cada
 * (mesma lógica de VeiculosPage) e cruza os dois em memória, em vez de um
 * request por linha da tabela.
 */
export function useImagensPorVeiculoId(): Map<number, string | undefined> {
  const { data: veiculos } = useVeiculos({ size: 100 }, { silentError: true });
  const { data: catalogo } = useModelosVeiculo({ size: 100 }, { silentError: true });

  return useMemo(() => {
    const porModelo = new Map<string, string | undefined>();
    for (const m of catalogo?.content ?? []) {
      if (m.marca && m.modelo) porModelo.set(`${m.marca.toLowerCase()} ${m.modelo.toLowerCase()}`, m.imagemBase64);
    }
    const porVeiculoId = new Map<number, string | undefined>();
    for (const v of veiculos?.content ?? []) {
      if (v.id != null && v.marca && v.modelo) {
        porVeiculoId.set(v.id, porModelo.get(`${v.marca.toLowerCase()} ${v.modelo.toLowerCase()}`));
      }
    }
    return porVeiculoId;
  }, [veiculos, catalogo]);
}

export function ModeloVeiculoField({
  marca,
  modelo,
  onSelecionar,
  disabled,
}: {
  marca: string | undefined;
  modelo: string | undefined;
  onSelecionar: (modelo: { marca: string; modelo: string }) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // undefined = usuário ainda não escolheu nesta sessão (usa a resolução
  // passiva abaixo); null = escolheu uma entrada sem imagem de propósito.
  const [escolhaLocal, setEscolhaLocal] = useState<string | null | undefined>(undefined);
  const resolvida = useModeloVeiculoImagem(marca, modelo);
  const imagemEscolhida = escolhaLocal !== undefined ? escolhaLocal : resolvida;

  function selecionar(m: ModeloVeiculoResponse) {
    setEscolhaLocal(m.imagemBase64 ?? null);
    onSelecionar({ marca: m.marca ?? '', modelo: m.modelo ?? '' });
    setOpen(false);
  }

  return (
    <div className="col-span-full flex items-center gap-2">
      <ModeloVeiculoThumb base64={imagemEscolhida} />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <ImagePlus size={14} /> {marca || modelo ? 'Trocar modelo do catálogo' : 'Escolher modelo do catálogo (opcional)'}
      </Button>

      <ModeloVeiculoCatalogModal
        open={open}
        onClose={() => setOpen(false)}
        buscaInicial={[marca, modelo].filter(Boolean).join(' ')}
        onSelecionar={selecionar}
      />
    </div>
  );
}
