/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** "true" libera os pagamentos online (webhook de produção do PagBank no ar) e esconde o aviso de em breve. */
  readonly VITE_PAGBANK_WEBHOOK_LIBERADO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
