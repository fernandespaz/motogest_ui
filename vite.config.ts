/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Atualiza o service worker sozinho a cada novo deploy — sem isso, um
      // usuário que instalou o "app" podia ficar preso num bundle JS antigo
      // indefinidamente, sem nem saber que existe uma versão nova.
      registerType: 'autoUpdate',
      manifest: {
        name: 'MotoGest — Gestão de Oficinas',
        short_name: 'MotoGest',
        description: 'Sistema de gestão para oficinas mecânicas — orçamentos, ordens de serviço, estoque e financeiro.',
        lang: 'pt-BR',
        theme_color: '#1c1f26',
        background_color: '#1c1f26',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Só a casca do app (JS/CSS/HTML/ícones) entra em cache — nada de
        // pré-cachear chamadas de API. Isso garante instalabilidade e um
        // carregamento inicial mais rápido sem arriscar mostrar dado de
        // negócio (OS, estoque, preço) desatualizado por causa de cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // O fundo da tela de login (~2,6MB) não precisa estar disponível
        // offline nem atrasar a instalação do service worker — o navegador
        // busca ele normal na hora, como qualquer imagem comum.
        globIgnores: ['**/login-bg.png'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**', 'src/main.tsx'],
    },
  },
});
