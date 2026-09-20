/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Chave pública do PagBank para criptografia de cartão no navegador — não é
  // segredo (ver src/lib/pagbankSdk.ts), mas ainda não configurada em nenhum
  // ambiente deste projeto.
  readonly VITE_PAGBANK_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
