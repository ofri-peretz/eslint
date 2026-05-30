/**
 * /play Playground Lock Tests
 *
 * CRITICAL: Pins the structure and behavior of the `/play` playground
 * surface so refactors can't accidentally regress it. Per CLAUDE.md:
 * "a fix is not done until a test would have caught the bug pre-deploy."
 *
 * Two test surfaces:
 *  1. Pure helper functions in `snippets.ts` — `getPluginPrefix`,
 *     `pluginsInSnippet`, `buildConfigSnippet`, identifier mapping.
 *     Real assertions on actual values.
 *  2. Source-string structural tests on each component — assert each
 *     subcomponent (`ExamplePicker`, `PluginToggleStrip`, `EditorToolbar`,
 *     `FindingsList`, `usePlaygroundState`, `PlaygroundDemo`) exists,
 *     uses the expected primitives from `@interlace/ui`, wires the
 *     accessibility contract (roving-tabindex, aria-pressed,
 *     aria-selected), and cleans up its side effects.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import {
  PLAYGROUND_SNIPPETS,
  getPluginPrefix,
  pluginsInSnippet,
  buildConfigSnippet,
  pluginPrefixToIdentifier,
  PLUGIN_PREFIX_TO_PACKAGE,
  getSnippetBySlug,
} from '../components/play/snippets';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const ROOT = resolve(__dirname, '../../src/components/play');

function readPlayFile(name: string): string {
  return readFileSync(join(ROOT, name), 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────
// 1. snippets.ts — pure helpers
// ─────────────────────────────────────────────────────────────────────────

describe('snippets: pure helpers', () => {
  describe('getPluginPrefix', () => {
    it('returns the part before the first slash', () => {
      expect(getPluginPrefix('jwt/no-algorithm-none')).toBe('jwt');
      expect(getPluginPrefix('secure-coding/no-hardcoded-credentials')).toBe('secure-coding');
      expect(getPluginPrefix('mongodb-security/no-unsafe-query')).toBe('mongodb-security');
    });

    it('returns the full id when there is no slash (defensive)', () => {
      expect(getPluginPrefix('no-slash-here')).toBe('no-slash-here');
    });
  });

  describe('pluginsInSnippet', () => {
    it('returns unique plugin prefixes in first-occurrence order', () => {
      const snippet = getSnippetBySlug('secure-coding-hardcoded-credentials');
      // 3 findings, all of plugin `secure-coding` — dedup to one entry.
      expect(pluginsInSnippet(snippet)).toEqual(['secure-coding']);
    });

    it('returns empty array for a snippet with no findings', () => {
      expect(
        pluginsInSnippet({
          slug: 'x',
          title: 'x',
          description: 'x',
          tag: 'x',
          code: '',
          findings: [],
        }),
      ).toEqual([]);
    });
  });

  describe('pluginPrefixToIdentifier', () => {
    it('produces a lower-camelCase JS identifier from a prefix', () => {
      expect(pluginPrefixToIdentifier('jwt')).toBe('jwt');
      expect(pluginPrefixToIdentifier('secure-coding')).toBe('secureCoding');
      expect(pluginPrefixToIdentifier('mongodb-security')).toBe('mongodbSecurity');
      expect(pluginPrefixToIdentifier('react-a11y')).toBe('reactA11y');
    });
  });

  describe('buildConfigSnippet', () => {
    it('returns the empty-state comment when no plugins are enabled', () => {
      const out = buildConfigSnippet([]);
      expect(out).toContain('Enable at least one plugin');
      expect(out).not.toContain('import ');
    });

    it('emits an import + spread for each enabled plugin', () => {
      const out = buildConfigSnippet(['pg', 'secure-coding']);
      expect(out).toContain("import pg from '@interlace/eslint-plugin-pg';");
      expect(out).toContain("import secureCoding from '@interlace/eslint-plugin-secure-coding';");
      expect(out).toContain('...pg.configs.flagship,');
      expect(out).toContain('...secureCoding.configs.flagship,');
    });

    it('emits the @type/eslint Config typedef so editors get autocompletion', () => {
      const out = buildConfigSnippet(['jwt']);
      expect(out).toContain("@type {import('eslint').Linter.Config[]}");
    });

    it('uses the canonical package name from PLUGIN_PREFIX_TO_PACKAGE', () => {
      const out = buildConfigSnippet(['vercel-ai-security']);
      expect(out).toContain(
        `import vercelAiSecurity from '${PLUGIN_PREFIX_TO_PACKAGE['vercel-ai-security']}';`,
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. PLAYGROUND_SNIPPETS — data integrity
// ─────────────────────────────────────────────────────────────────────────

describe('PLAYGROUND_SNIPPETS: data integrity', () => {
  it('ships at least 6 canonical examples (one per visually-evident flagship rule)', () => {
    expect(PLAYGROUND_SNIPPETS.length).toBeGreaterThanOrEqual(6);
  });

  it('every snippet has a unique slug', () => {
    const slugs = PLAYGROUND_SNIPPETS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every snippet has a non-empty code block', () => {
    for (const s of PLAYGROUND_SNIPPETS) {
      expect(s.code, `snippet "${s.slug}" has empty code`).not.toBe('');
    }
  });

  it('every snippet has at least one finding (otherwise it does not demonstrate a rule)', () => {
    for (const s of PLAYGROUND_SNIPPETS) {
      expect(s.findings.length, `snippet "${s.slug}" has no findings`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every finding has a ruleDocsPath starting with /docs/', () => {
    for (const s of PLAYGROUND_SNIPPETS) {
      for (const f of s.findings) {
        expect(
          f.ruleDocsPath,
          `${s.slug}: finding for ${f.ruleId} has non-/docs/ path`,
        ).toMatch(/^\/docs\//);
      }
    }
  });

  it('every plugin prefix referenced by a finding has a PLUGIN_PREFIX_TO_PACKAGE entry', () => {
    for (const s of PLAYGROUND_SNIPPETS) {
      for (const f of s.findings) {
        const prefix = getPluginPrefix(f.ruleId);
        expect(
          PLUGIN_PREFIX_TO_PACKAGE[prefix],
          `prefix "${prefix}" (from rule "${f.ruleId}") missing from PLUGIN_PREFIX_TO_PACKAGE map`,
        ).toBeDefined();
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Component-tree structural lock
// ─────────────────────────────────────────────────────────────────────────

describe('Playground component tree: required files', () => {
  const files = [
    'PlaygroundDemo.tsx',
    'PlaygroundEditor.tsx',
    'ExamplePicker.tsx',
    'PluginToggleStrip.tsx',
    'EditorToolbar.tsx',
    'FindingsList.tsx',
    'usePlaygroundState.ts',
    'snippets.ts',
  ];

  for (const f of files) {
    it(`${f} exists`, () => {
      expect(existsSync(join(ROOT, f))).toBe(true);
    });
  }
});

describe('PlaygroundEditor: macOS CodeWindow chrome', () => {
  let src: string;
  beforeAll(() => {
    src = readPlayFile('PlaygroundEditor.tsx');
  });

  it('imports CodeWindow + CodeWindowTitleBar from @interlace/ui', () => {
    expect(src).toContain(
      "import { CodeWindow, CodeWindowTitleBar } from '@interlace/ui/blocks/code-window'",
    );
  });

  it('wraps the Monaco editor in <CodeWindow> with a title bar', () => {
    expect(src).toContain('<CodeWindow');
    expect(src).toContain('<CodeWindowTitleBar');
  });

  it('derives a default filename from the language prop', () => {
    expect(src).toContain('defaultFilenameFor');
    expect(src).toContain("'playground.js'");
    expect(src).toContain("'playground.tsx'");
  });
});

describe('PlaygroundDemo composition', () => {
  let src: string;
  beforeAll(() => {
    src = readPlayFile('PlaygroundDemo.tsx');
  });

  it('is a client component (uses next/dynamic, hooks)', () => {
    expect(src).toContain("'use client'");
  });

  it('lazy-loads the Monaco editor via next/dynamic with ssr: false', () => {
    expect(src).toContain("import dynamic from 'next/dynamic'");
    expect(src).toMatch(/ssr:\s*false/);
  });

  it('wraps the surface in TooltipProvider', () => {
    expect(src).toContain("import { TooltipProvider }");
    expect(src).toContain('<TooltipProvider>');
  });

  it('composes the four focused subcomponents', () => {
    expect(src).toContain('<ExamplePicker');
    expect(src).toContain('<PluginToggleStrip');
    expect(src).toContain('<EditorToolbar');
    expect(src).toContain('<FindingsList');
  });

  it('drives state via usePlaygroundState (not inline useState/useEffect)', () => {
    expect(src).toContain('usePlaygroundState');
    // Inline state would be a regression — the hook is the single source of truth.
    expect(src).not.toContain("useState<string>('");
  });
});

describe('ExamplePicker', () => {
  let src: string;
  beforeAll(() => {
    src = readPlayFile('ExamplePicker.tsx');
  });

  it('uses @interlace/ui Button primitive (not bespoke <button>)', () => {
    expect(src).toContain("import { Button } from '@interlace/ui/button'");
  });

  it('renders desktop tabs with role="tab" + aria-selected', () => {
    expect(src).toContain('role="tablist"');
    expect(src).toContain('role="tab"');
    expect(src).toContain('aria-selected');
  });

  it('implements roving-tabindex (tabIndex on each tab)', () => {
    expect(src).toMatch(/tabIndex=\{selected\s*\?\s*0\s*:\s*-1\}/);
  });

  it('handles arrow-key navigation (ArrowRight + ArrowLeft + Home + End)', () => {
    expect(src).toContain("'ArrowRight'");
    expect(src).toContain("'ArrowLeft'");
    expect(src).toContain("'Home'");
    expect(src).toContain("'End'");
  });

  it('falls back to a native <select> on mobile', () => {
    expect(src).toContain('<select');
    expect(src).toContain('md:hidden');
  });

  it('supports Cmd+K / Ctrl+K to focus the active tab', () => {
    expect(src).toContain('useCmdKShortcut');
    expect(src).toMatch(/metaKey|ctrlKey/);
    expect(src).toMatch(/['"`]k['"`]/);
  });

  it('shows the Cmd+K shortcut hint on desktop', () => {
    expect(src).toContain('⌘K');
    expect(src).toContain('Ctrl+K');
  });
});

describe('PluginToggleStrip', () => {
  let src: string;
  beforeAll(() => {
    src = readPlayFile('PluginToggleStrip.tsx');
  });

  it('uses Button + Tooltip primitives from @interlace/ui', () => {
    expect(src).toContain("from '@interlace/ui/button'");
    expect(src).toContain("from '@interlace/ui/tooltip'");
  });

  it('every chip is aria-pressed-tagged', () => {
    expect(src).toContain('aria-pressed');
  });

  it('the Copy button is aria-live for screen-reader announcement', () => {
    expect(src).toContain('aria-live="polite"');
  });

  it('the Copy button is wrapped in a Tooltip explaining the copied snippet', () => {
    expect(src).toContain('<Tooltip>');
    expect(src).toContain('configs.flagship');
  });
});

describe('EditorToolbar', () => {
  let src: string;
  beforeAll(() => {
    src = readPlayFile('EditorToolbar.tsx');
  });

  it('renders the Reset button (only when edited)', () => {
    expect(src).toContain('onReset');
    expect(src).toContain('Reset');
  });

  it('renders the disabled Run · Phase 2 placeholder wrapped in a Tooltip', () => {
    expect(src).toContain('disabled');
    expect(src).toContain('Run · Phase 2');
    expect(src).toContain('oxlint WASM');
  });
});

describe('FindingsList', () => {
  let src: string;
  beforeAll(() => {
    src = readPlayFile('FindingsList.tsx');
  });

  it('uses Badge primitive for severity pills', () => {
    expect(src).toContain("from '@interlace/ui/badge'");
    expect(src).toContain("variant={f.severity === 'error' ? 'destructive' : 'secondary'}");
  });

  it('handles the three states: edited / empty / list', () => {
    expect(src).toContain('isEdited');
    expect(src).toContain('EmptyState');
    expect(src).toContain('FindingCard');
  });

  it('finding cards have a hover affordance (they are effectively clickable entries)', () => {
    expect(src).toMatch(/hover:border-fd-primary\/40/);
  });
});

describe('usePlaygroundState', () => {
  let src: string;
  beforeAll(() => {
    src = readPlayFile('usePlaygroundState.ts');
  });

  it('owns the URL-state contract for ?example= and ?plugins=', () => {
    expect(src).toContain("import { useRouter, useSearchParams } from 'next/navigation'");
    expect(src).toContain("p.set('example'");
    expect(src).toContain("p.set('plugins'");
  });

  it('cleans up the Copied timer on unmount via useRef + useEffect cleanup', () => {
    expect(src).toContain('copyTimerRef');
    expect(src).toContain('clearTimeout');
    expect(src).toContain('useEffect(() => {');
  });
});
