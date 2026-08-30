/**
 * Lock for the recall job's build filter.
 *
 * `quality.yml`'s `recall` job used to build all 32 packages to serve a gate
 * that takes 6 seconds. Measured on run 33324089803: the build was 159s of a
 * 194s job — 82% — and that job IS `quality.yml`'s wall-clock. It now builds
 * only the plugins the corpus config actually imports.
 *
 * That trade is only safe while the two lists agree. A plugin added to
 * `interlace.config.js` but not to the workflow filter would go unbuilt; the
 * benchmark refuses to score an unresolvable config rather than reporting zero
 * findings, so it fails loudly rather than silently passing — but it fails as
 * a confusing resolution error in an unrelated job. This test names the real
 * cause instead.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/corpus-build-filter-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'quality.yml');
const CORPUS_CONFIG = join(
  ROOT,
  'benchmarks',
  'suites',
  'ilb-arena',
  'configs',
  'interlace.config.js',
);

/** Every `eslint-plugin-*` the corpus config imports. */
function pluginsInCorpusConfig(): string[] {
  const src = readFileSync(CORPUS_CONFIG, 'utf8');
  return [...new Set(src.match(/eslint-plugin-[a-z0-9-]+/g) ?? [])].sort();
}

/**
 * Every plugin named in the recall job's `--filter=` flags.
 *
 * Scoped to the build step rather than the whole file: other jobs legitimately
 * name plugins for other reasons, and matching those would make this pass for
 * the wrong reason.
 */
function pluginsInBuildFilter(): string[] {
  const src = readFileSync(WORKFLOW, 'utf8');
  const step = src.slice(
    src.indexOf('Build the plugins the corpus config imports'),
  );
  const body = step.slice(0, step.indexOf('- name: Every CWE'));
  return [
    ...new Set(
      (body.match(/--filter=(eslint-plugin-[a-z0-9-]+)/g) ?? []).map((m) =>
        m.replace('--filter=', ''),
      ),
    ),
  ].sort();
}

describe('recall build filter', () => {
  it('builds exactly the plugins the corpus config imports', () => {
    expect(pluginsInBuildFilter()).toEqual(pluginsInCorpusConfig());
  });

  // Guards the failure mode where a bad selector or a renamed step makes both
  // sides empty: [] === [] would pass while locking nothing at all.
  it('is not vacuous — both sides found real plugins', () => {
    expect(pluginsInCorpusConfig().length).toBeGreaterThan(5);
    expect(pluginsInBuildFilter().length).toBeGreaterThan(5);
  });

  // `...` makes turbo build each plugin's dependencies too, which is how
  // @interlace/eslint-devkit still gets built. Without it the plugins resolve
  // against a stale or missing devkit dist.
  it('includes dependencies via the ... suffix', () => {
    const src = readFileSync(WORKFLOW, 'utf8');
    const step = src.slice(
      src.indexOf('Build the plugins the corpus config imports'),
    );
    const body = step.slice(0, step.indexOf('- name: Every CWE'));
    for (const plugin of pluginsInBuildFilter()) {
      expect(body, `${plugin} must build its dependencies`).toContain(
        `--filter=${plugin}...`,
      );
    }
  });
});
