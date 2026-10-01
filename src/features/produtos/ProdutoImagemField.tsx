import { useRef, useState, type ChangeEvent } from 'react';
import { ImageSquare, Trash, UploadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { carregarImagem } from '@/lib/imagem';
import { toast } from '@/store/toastStore';
import type { ProdutoResponse } from '@/api/types';
import { ProdutoImagem, useObjectUrl } from './ProdutoImagem';
import { ProdutoImagemRecorte } from './ProdutoImagemRecorte';

export const PRODUTO_IMAGEM_TIPOS_ACEITOS = ['image/png', 'image/jpeg'];
export const PRODUTO_IMAGEM_TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5MB — mesmo limite validado no backend

/**
 * Seletor da foto do produto. Não envia nada sozinho: só guarda a escolha (via
 * `onArquivoChange` / `onRemoverChange`) e o formulário aplica tudo ao salvar —
 * assim cadastrar um produto novo (que ainda não tem id) usa o mesmo fluxo de
 * editar, e cancelar o modal não deixa foto alterada pela metade.
 */
export function ProdutoImagemField({
  produto,
  arquivo,
  remover,
  onArquivoChange,
  onRemoverChange,
  disabled,
}: {
  produto?: ProdutoResponse | null;
  arquivo: File | null;
  remover: boolean;
  onArquivoChange: (arquivo: File | null) => void;
  onRemoverChange: (remover: boolean) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Foto escolhida que ainda está sendo recortada (só vira `arquivo` ao aplicar o recorte).
  const [recortando, setRecortando] = useState<{ imagem: ImageBitmap; nome: string } | null>(null);
  const previewUrl = useObjectUrl(arquivo);
  const temFotoSalva = !!produto?.imagemUrl && !remover;
  const temFoto = !!arquivo || temFotoSalva;

  async function handleArquivoSelecionado(e: ChangeEvent<HTMLInputElement>) {
    const selecionado = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo depois de descartá-lo
    if (!selecionado) return;

    if (!PRODUTO_IMAGEM_TIPOS_ACEITOS.includes(selecionado.type)) {
      toast.error('Envie uma imagem PNG ou JPEG.');
      return;
    }
    if (selecionado.size > PRODUTO_IMAGEM_TAMANHO_MAXIMO) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }
    // O backend recorta toda foto em 2:1 — o usuário enquadra aqui antes, pra
    // escolher o que fica. Se o navegador não decodificar, vai o arquivo original.
    const imagem = await carregarImagem(selecionado);
    if (!imagem) {
      onArquivoChange(selecionado);
      onRemoverChange(false);
      return;
    }
    setRecortando({ imagem, nome: selecionado.name });
  }

  function handleRemover() {
    if (arquivo) {
      onArquivoChange(null); // descarta só a escolha; a foto já salva (se houver) volta a aparecer
      return;
    }
    onRemoverChange(true);
  }

  const placeholder = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-muted">
      <ImageSquare size={36} weight="duotone" aria-hidden />
      <span className="text-xs">Sem foto</span>
    </div>
  );

  if (recortando) {
    return (
      <ProdutoImagemRecorte
        imagem={recortando.imagem}
        nomeArquivo={recortando.nome}
        onConfirmar={(recortado) => {
          onArquivoChange(recortado);
          onRemoverChange(false);
          setRecortando(null);
        }}
        onCancelar={() => setRecortando(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div
        className="aspect-[2/1] w-full max-w-[16rem] shrink-0 overflow-hidden rounded-xl border border-border bg-surface-alt"
        data-testid="produto-imagem-preview"
      >
        {previewUrl?.startsWith('blob:') ? (
          <img src={previewUrl} alt="Pré-visualização da foto do produto" className="h-full w-full object-cover" />
        ) : temFotoSalva ? (
          <ProdutoImagem
            produtoId={produto?.id}
            imagemUrl={produto?.imagemUrl}
            alt={`Foto de ${produto?.nome ?? 'produto'}`}
            fallback={placeholder}
          />
        ) : (
          placeholder
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-ink">Foto do produto</p>
          <p className="text-xs text-ink-muted">
            PNG ou JPEG, até 5MB. Você enquadra a foto no formato 2:1 antes de salvar.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            data-testid="produto-imagem-input"
            onChange={handleArquivoSelecionado}
            disabled={disabled}
          />
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <UploadSimple size={14} /> {temFoto ? 'Trocar foto' : 'Escolher foto'}
          </Button>
          {temFoto && (
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={handleRemover}>
              <Trash size={14} /> Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
