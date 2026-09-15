import '@testing-library/jest-dom/vitest';

// jsdom não implementa matchMedia — src/store/themeStore.ts usa pra reagir à
// preferência de tema do SO (modo "sistema"), e qualquer teste que importe
// esse módulo (direto ou via ThemeToggle/Topbar) quebra sem esse stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
