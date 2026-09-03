/**
 * Foundation radius/inset token lock.
 *
 * `--radius-2xs`, `--radius-xs`, and `--inset-control-sm` are load-bearing:
 * `checkbox.tsx` / `tooltip.tsx` / `tabs.tsx` reference them via
 * `rounded-[var(--token)]` / `p-[var(--token)]`. If a token is renamed or
 * removed in foundation.css without updating its consumer, Tailwind
 * resolves the arbitrary value to nothing (0px) with no build or lint
 * failure — a silent visual regression. Per CLAUDE.md's lock-everything
 * policy, this pins both sides of that contract.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES_ROOT = join(
  __dirname,
  '../../../../packages/ui/styles/foundation.css',
);
const PRIMITIVES_ROOT = join(
  __dirname,
  '../../../../packages/ui/src/primitives',
);

const TOKENS = ['--radius-2xs', '--radius-xs', '--inset-control-sm'] as const;

const CONSUMERS = [
  { file: 'checkbox.tsx', token: '--radius-xs' },
  { file: 'tooltip.tsx', token: '--radius-2xs' },
  { file: 'tabs.tsx', token: '--inset-control-sm' },
] as const;

describe('foundation.css radius/inset tokens', () => {
  const css = readFileSync(STYLES_ROOT, 'utf8');

  for (const token of TOKENS) {
    it(`defines ${token}`, () => {
      expect(css).toContain(`${token}:`);
    });
  }

  for (const { file, token } of CONSUMERS) {
    it(`${file} references ${token} via var(...)`, () => {
      const source = readFileSync(join(PRIMITIVES_ROOT, file), 'utf8');
      expect(source).toContain(`var(${token})`);
    });
  }
});
