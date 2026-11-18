/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Locks AA contrast for highlighted code (issue #1515).
 *
 * The scheduled Lighthouse run failed `color-contrast` on
 * `/docs/security/plugin-vercel-ai-security`: comment spans in
 * `--shiki-light:#6A737D` (fumadocs' `github-light` default) on the tab
 * background #f1f1f1, 4.26:1. The site had three highlighters — MDX, the
 * remote README compiler, client `DynamicCodeBlock` — and only the first was
 * configured. These assertions fail if any of them drifts off the shared
 * settings, or if the shared settings stop clearing 4.5:1.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import githubLightDefault from 'shiki/themes/github-light-default.mjs';

import { CODE_COLOR_REPLACEMENTS, CODE_THEMES } from '@/lib/code-highlight';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p: string) => readFileSync(join(DOCS, p), 'utf-8');

/** Code-block backgrounds in light mode: in-tab (`bg-fd-secondary`, as Lighthouse measured it) and standalone. */
const BACKGROUNDS = ['#f1f1f1', '#ffffff'];

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory())
      return name === '__tests__' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('code highlight contrast lock (#1515)', () => {
  it('every light-theme token colour clears 4.5:1 on every code background', () => {
    expect(CODE_THEMES.light).toBe(githubLightDefault.name);
    const replace = CODE_COLOR_REPLACEMENTS[CODE_THEMES.light] ?? {};
    const colours = new Set<string>([
      githubLightDefault.colors?.['editor.foreground'] ?? '',
    ]);
    for (const token of githubLightDefault.tokenColors ?? []) {
      const fg = token.settings?.foreground;
      // Token colours only; markup.* backgrounds (#f6f8fa, #eaeef2) are tints, not text.
      if (fg && /^#[0-9a-f]{6}$/i.test(fg) && !token.settings?.background) {
        colours.add(fg.toLowerCase());
      }
    }
    colours.delete('');

    const failing = [...colours].flatMap((raw) => {
      const fg = replace[raw] ?? raw;
      return BACKGROUNDS.filter((bg) => contrast(fg, bg) < 4.5).map(
        (bg) =>
          `${raw}${fg === raw ? '' : ` → ${fg}`} on ${bg}: ${contrast(fg, bg).toFixed(2)}`,
      );
    });
    expect(failing).toEqual([]);
  });

  it('nothing renders fumadocs DynamicCodeBlock with its github-light default', () => {
    const offenders = walk(join(DOCS, 'src'))
      .filter((f) =>
        read(relative(DOCS, f)).includes(
          "'fumadocs-ui/components/dynamic-codeblock'",
        ),
      )
      .map((f) => relative(DOCS, f));
    expect(offenders).toEqual(['src/components/docs/code-block.tsx']);
    expect(read('src/components/docs/code-block.tsx')).toContain(
      'options={CODE_HIGHLIGHT_OPTIONS}',
    );
  });

  it('local MDX and every remote markdown compiler use the shared options', () => {
    expect(read('source.config.ts')).toContain('...CODE_HIGHLIGHT_OPTIONS');
    const compiler = read('src/lib/mdx-compiler.tsx');
    const compilers = compiler.match(/createCompiler\(\{/g)?.length ?? 0;
    const configured =
      compiler.match(/rehypeCodeOptions: CODE_HIGHLIGHT_OPTIONS/g)?.length ?? 0;
    expect(compilers).toBeGreaterThan(0);
    expect(configured).toBe(compilers);
  });
});
