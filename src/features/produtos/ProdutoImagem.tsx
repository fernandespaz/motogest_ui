import { useEffect, useState, type ReactNode } from 'react';
import { useProdutoImagemBlob } from '@/hooks/useProdutos';

/** Blob/File → URL local (`blob:`), revogada quando o blob muda ou o componente sai de cena. */
export function useObjectUrl(blob?: Blob | null): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const novaUrl = URL.createObjectURL(blob);
    // Só aceita URL blob: gerada localmente — nunca um esquema arbitrário em <img src>.
    setUrl(novaUrl.startsWith('blob:') ? novaUrl : undefined);
    return () => URL.revokeObjectURL(novaUrl);
  }, [blob]);

  return url;
}

/**
 * Foto do produto, ou `fallback` (ícone da categoria) quando ele não tem foto
 * ou a busca falhou — a imagem é só visual, nunca deve quebrar o cartão.
 */
export function ProdutoImagem({
  produtoId,
  imagemUrl,
  alt,
  fallback,
}: {
  produtoId?: number;
  imagemUrl?: string | null;
  alt: string;
  fallback: ReactNode;
}) {
  const { data: blob } = useProdutoImagemBlob(produtoId, imagemUrl);
  const src = useObjectUrl(blob);

  if (!src) return <>{fallback}</>;
  // object-contain sobre fundo branco: a foto aparece inteira em qualquer altura
  // de cartão (as fotos já são 2:1 com fundo branco — ver lib/imagem.ts), sem corte.
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
}
