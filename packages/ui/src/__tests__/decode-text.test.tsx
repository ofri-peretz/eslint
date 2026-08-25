/**
 * DecodeText locks — the honesty contract above all (R26).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DecodeText } from '../effects/decode-text.js';

describe('DecodeText static markup', () => {
  it('always renders the FINAL text — crawlers never see glyph noise', () => {
    const html = renderToStaticMarkup(
      <DecodeText data-testid="d">WEB · SECURITY</DecodeText>,
    );
    expect(html).toContain('WEB · SECURITY');
    for (const g of ['[', ']', '{', '}', '^']) {
      expect(html).not.toContain(g);
    }
  });

  it('carries the slot and testid contract', () => {
    const html = renderToStaticMarkup(
      <DecodeText data-testid="chip">x</DecodeText>,
    );
    expect(html).toContain('data-slot="decode-text"');
    expect(html).toContain('data-testid="chip"');
  });

  it('source gates the decode on prefers-reduced-motion', () => {
    // Behavior lock at the source level: the rAF path must bail under
    // reduced motion (jsdom can't drive matchMedia through rAF honestly).
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../effects/decode-text.tsx'),
      'utf-8',
    );
    expect(src).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
  });
});
