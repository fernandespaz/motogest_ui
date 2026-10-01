import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/Button';
import {
  RECORTE_ALTURA,
  RECORTE_LARGURA,
  ZOOM_MAXIMO,
  desenharEnquadramento,
  exportarRecorte,
  limitarEnquadramento,
  type Enquadramento,
} from '@/lib/imagem';

/**
 * Editor de recorte 2:1 da foto do produto: arrastar move a foto, o controle de
 * zoom aproxima. Começa com a foto inteira visível (zoom 1); o que está dentro do
 * quadro é exatamente o que vai pro cartão — o backend recorta em 2:1 e, como o
 * quadro já é 2:1, esse recorte dele não muda nada.
 */
export function ProdutoImagemRecorte({
  imagem,
  nomeArquivo,
  onConfirmar,
  onCancelar,
}: {
  imagem: ImageBitmap;
  nomeArquivo: string;
  onConfirmar: (arquivo: File) => void;
  onCancelar: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  const [enq, setEnq] = useState<Enquadramento>({ zoom: 1, dx: 0, dy: 0 });
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) desenharEnquadramento(ctx, imagem, enq);
  }, [imagem, enq]);

  function iniciarArrasto(e: PointerEvent<HTMLCanvasElement>) {
    arrasto.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function arrastar(e: PointerEvent<HTMLCanvasElement>) {
    if (!arrasto.current) return;
    // O canvas tem 480px lógicos mas pode estar menor na tela — converte o movimento do mouse pra px do quadro.
    const razao = RECORTE_LARGURA / e.currentTarget.getBoundingClientRect().width;
    const movX = (e.clientX - arrasto.current.x) * razao;
    const movY = (e.clientY - arrasto.current.y) * razao;
    arrasto.current = { x: e.clientX, y: e.clientY };
    setEnq((atual) => limitarEnquadramento({ ...atual, dx: atual.dx + movX, dy: atual.dy + movY }));
  }

  async function confirmar() {
    setGerando(true);
    const arquivo = await exportarRecorte(imagem, enq, nomeArquivo);
    setGerando(false);
    if (arquivo) onConfirmar(arquivo);
  }

  return (
    <div className="flex flex-col gap-3" data-testid="produto-imagem-recorte">
      <p className="text-sm font-medium text-ink">Ajuste o enquadramento</p>
      <canvas
        ref={canvasRef}
        width={RECORTE_LARGURA}
        height={RECORTE_ALTURA}
        aria-label="Área de recorte da foto — arraste para mover"
        onPointerDown={iniciarArrasto}
        onPointerMove={arrastar}
        onPointerUp={() => (arrasto.current = null)}
        onPointerCancel={() => (arrasto.current = null)}
        className="aspect-[2/1] w-full max-w-md cursor-grab touch-none rounded-xl border border-border active:cursor-grabbing"
      />
      <label className="flex max-w-md items-center gap-3 text-xs text-ink-muted">
        Zoom
        <input
          type="range"
          min={1}
          max={ZOOM_MAXIMO}
          step={0.01}
          value={enq.zoom}
          onChange={(e) => setEnq((atual) => ({ ...atual, zoom: Number(e.target.value) }))}
          className="flex-1 accent-brand-600"
        />
      </label>
      <p className="text-xs text-ink-muted">Arraste a foto para posicionar. Tudo que aparece no quadro vai para o cartão.</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={gerando} onClick={confirmar}>
          Aplicar recorte
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={gerando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
