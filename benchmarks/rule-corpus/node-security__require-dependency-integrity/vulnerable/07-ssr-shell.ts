/**
 * VULNERABLE - a typed SSR shell. The markup is a `const` of type `string`
 * assembled per request; the type annotation changes nothing about the two
 * unprotected CDN tags it contains.
 */
export interface ShellOptions {
  title: string;
  nonce: string;
}

export function renderShell({ title, nonce }: ShellOptions): string {
  const head: string = `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
    <script src="https://unpkg.com/alpinejs@3.13.3/dist/cdn.min.js" nonce="${nonce}" defer></script>
  `;

  return `<!doctype html><html><head><title>${title}</title>${head}</head><body></body></html>`;
}
