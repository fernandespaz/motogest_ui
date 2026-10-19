import { ShieldWarning, Copy } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { rotuloDaPermissao, usePermissaoNegadaStore } from '@/lib/permissaoNegada';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

/**
 * Explica um 403 em vez de um toast genérico: diz qual permissão o perfil precisa ter e o que pedir ao
 * administrador da oficina — quem recebe o erro costuma ser quem opera (caixa, mecânico) e não tem como
 * resolver sozinho, só levar o pedido certo a quem edita o perfil em Perfis de Acesso.
 * O backend não informa qual permissão faltou; ela vem de `permissoesExigidas` (tabela gerada dos controllers).
 */
export function PermissaoNegadaDialog() {
  const negada = usePermissaoNegadaStore((s) => s.negada);
  const fechar = usePermissaoNegadaStore((s) => s.fechar);
  const perfil = useAuthStore((s) => s.perfil);
  const permissoes = useAuthStore((s) => s.permissoes);

  const codigos = negada?.codigos ?? [];
  // Já tem uma das permissões aceitas: o bloqueio é por outro motivo (ex.: registro de outro usuário) — não adianta pedir permissão.
  const jaTemPermissao = codigos.some((c) => permissoes.includes(c));
  const faltantes = jaTemPermissao ? [] : codigos;
  const nomePerfil = perfil ? `"${perfil}"` : 'do seu usuário';

  const pedido =
    faltantes.length === 0
      ? ''
      : `Olá! Meu perfil ${nomePerfil} não tem acesso a uma função do MotoGest. ` +
        (faltantes.length === 1
          ? `Preciso da permissão "${rotuloDaPermissao(faltantes[0])}" (${faltantes[0]}).`
          : `Preciso de uma destas permissões: ${faltantes.map((c) => `"${rotuloDaPermissao(c)}" (${c})`).join(' ou ')}.`) +
        ' Pode liberar em Administração › Perfis de Acesso?';

  async function copiarPedido() {
    try {
      await navigator.clipboard.writeText(pedido);
      toast.info('Pedido copiado — envie ao administrador da oficina.');
    } catch {
      toast.error('Não foi possível copiar. Anote a permissão e peça ao administrador.');
    }
  }

  return (
    <Modal open={!!negada} onClose={fechar} size="sm" centered>
      <div className="flex flex-col items-center gap-3 py-1 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger dark:bg-red-900/30">
          <ShieldWarning size={26} weight="fill" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-ink">Seu perfil não tem acesso a esta ação</h2>

        {faltantes.length > 0 ? (
          <>
            <p className="text-sm text-ink-muted">
              {faltantes.length === 1 ? 'Para continuar, o perfil precisa da permissão:' : 'Para continuar, o perfil precisa de uma destas permissões:'}
            </p>
            <ul className="flex w-full flex-col gap-2">
              {faltantes.map((codigo) => (
                <li key={codigo} className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-left">
                  <p className="text-sm font-semibold text-ink">{rotuloDaPermissao(codigo)}</p>
                  <p className="font-mono text-xs text-ink-muted">{codigo}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-muted">
              Peça ao <strong className="text-ink">administrador da oficina</strong> para liberar em{' '}
              <strong className="text-ink">Administração › Perfis de Acesso</strong>, editando o perfil{' '}
              <strong className="text-ink">{perfil ? `“${perfil}”` : 'do seu usuário'}</strong>.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            {jaTemPermissao
              ? 'Seu perfil tem a permissão para esta função, mas ela não vale para este registro (por exemplo, algo de outro usuário). Procure o administrador da oficina se precisar de ajuda.'
              : 'Não foi possível identificar qual permissão falta. Procure o administrador da oficina e informe o que você estava tentando fazer.'}
          </p>
        )}

        <div className="mt-1 flex w-full flex-col gap-2">
          {faltantes.length > 0 && (
            <Button variant="secondary" className="w-full" onClick={copiarPedido}>
              <Copy size={16} /> Copiar pedido para o administrador
            </Button>
          )}
          <Button className="w-full" onClick={fechar}>
            Entendi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
