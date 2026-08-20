/**
 * SAFE - A protocol-relative URL chooses no scheme of its own; it follows the
 * document. Dated, but not mixed content.
 */
const script = document.createElement('script');
script.src = '//cdn.acme-corp.io/lib.js';
