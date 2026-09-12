import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';

/**
 * Safety net for endpoint calls that don't already surface their own error
 * (e.g. list/detail queries feeding a page's initial render). Mutations that
 * handle their own error UI can opt out with `meta: { silentError: true }`.
 */
function reportQueryError(error: unknown, silent: boolean | undefined) {
  if (silent) return;
  toast.error(extractErrorMessage(error, 'Não foi possível carregar os dados.'));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => reportQueryError(error, query.meta?.silentError as boolean | undefined),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silentError) return;
      // Mutations are expected to handle their own error toast at the call
      // site (they need the specific action's wording); this only catches
      // the ones that don't, so nothing fails silently.
      if (mutation.meta?.hasLocalErrorHandling) return;
      toast.error(extractErrorMessage(error, 'Não foi possível concluir a ação.'));
    },
  }),
});
