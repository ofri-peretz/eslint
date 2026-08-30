/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the Stage 1 intent gate.
 *
 * Run against real throwaway git repositories, because the whole question is
 * about a diff — a mocked git would only prove the mock agrees with itself.
 *
 * The assertion that earns this file is **drift**. Everything else here is
 * hygiene a stub could satisfy; the drift check is the only one that can tell
 * you the work is not the work that was asked for, and a drift check that
 * silently passes is worse than none — it certifies scope that nobody read.
 *
 * The strict parser is tested directly for the same reason: it is hand-written
 * (neither `yaml` nor `js-yaml` is a declared dependency here), and a lenient
 * parser that dropped a `packages:` entry would turn the drift check into a
 * no-op with nothing to show for it.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { parseFrontmatter } from '../check-intent.ts';

const SCRIPT = resolve(__dirname, '..', 'check-intent.ts');
const REPO_ROOT = resolve(__dirname, '..', '..');

let repo: string;

function git(...args: string[]) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  execFileSync('git', args, { cwd: repo, env, stdio: 'pipe' });
}

function write(rel: string, content: string) {
  const full = join(repo, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

/**
 * `spawnSync`, not `execFileSync`: the advisories are written to stderr and
 * exit 0 without `--strict`, so a stdout-only helper reads them as empty
 * output and every assertion passes vacuously.
 */
function run(...args: string[]): { out: string; status: number } {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  const result = spawnSync('tsx', [SCRIPT, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...env,
      PATH: `${join(REPO_ROOT, 'node_modules', '.bin')}:${env.PATH ?? ''}`,
    },
  });
  return {
    out: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    status: result.status ?? 1,
  };
}

const BODY = [
  '## What',
  '',
  'A change a consumer notices.',
  '',
  '## Why',
  '',
  'A probe found it.',
  '',
  '## Constraints',
  '',
  'No gate may be weakened.',
  '',
  '## Done when',
  '',
  'The ratchet moved from 5 to 4.',
  '',
].join('\n');

function intent(packages: string[], cases: string[] = []): string {
  const list = (key: string, xs: string[]) =>
    xs.length === 0 ? '' : `${key}:\n${xs.map((x) => `  - ${x}`).join('\n')}\n`;
  return `---\nslug: probe\nopened: 2026-08-30\n${list('packages', packages)}${list('cases', cases)}---\n\n${BODY}`;
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'intent-gate-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');

  mkdirSync(join(repo, 'intent'), { recursive: true });
  write('docs/intents/README.md', '# intent\n');
  write(
    'packages/x/package.json',
    '{"name":"eslint-plugin-x","version":"1.0.0"}',
  );
  write('packages/x/src/index.ts', 'export const a = 1;\n');
  write(
    'packages/y/package.json',
    '{"name":"eslint-plugin-y","version":"1.0.0"}',
  );
  write('packages/y/src/index.ts', 'export const b = 1;\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('branch', 'base-ref');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('the declared blast radius is checked against the diff', () => {
  it('fails when the work spread past what it said it would touch', () => {
    // The failure this gate exists for: intent says one package, the agent
    // touched two, and without this nobody finds out until review.
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write('packages/y/src/index.ts', 'export const b = 2;\n');
    write('docs/intents/probe.md', intent(['x']));
    git('add', '-A');
    git('commit', '-q', '-m', 'change both');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('drift');
    expect(out).toContain('`y` is changed but not in any');
    expect(out).not.toContain('`x` is changed');
    expect(status).toBe(1);
  });

  it('passes when every changed package is declared', () => {
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write('packages/y/src/index.ts', 'export const b = 2;\n');
    write('docs/intents/probe.md', intent(['x', 'y']));
    git('add', '-A');
    git('commit', '-q', '-m', 'change both');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('all declared');
    expect(status).toBe(0);
  });

  it('a test-only change needs no intent', () => {
    write('packages/x/src/index.test.ts', "it('works', () => {});\n");
    git('add', '-A');
    git('commit', '-q', '-m', 'test only');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('No intent needed');
    expect(status).toBe(0);
  });

  it('reports missing when source changed and no intent was added', () => {
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'change');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('no intent file added');
    expect(status).toBe(1);
  });

  it('editing an existing intent is not new intent', () => {
    // Only ADDED files count, exactly as with changesets: an edit to an old
    // initiative's file would otherwise vouch for unrelated new work.
    write('docs/intents/old.md', intent(['x']));
    git('add', '-A');
    git('commit', '-q', '-m', 'old intent');
    git('branch', '-f', 'base-ref');

    write('docs/intents/old.md', `${intent(['x'])}\nA later thought.\n`);
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'edit');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('no intent file added');
    expect(status).toBe(1);
  });

  it('refuses a placeholder', () => {
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write(
      'docs/intents/probe.md',
      intent(['x']).replace('A probe found it.', 'TODO'),
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'change');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('placeholder');
    expect(status).toBe(1);
  });

  it('refuses a missing prose section', () => {
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write(
      'docs/intents/probe.md',
      intent(['x']).replace('## Constraints', '## Notes'),
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'change');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('## Constraints');
    expect(status).toBe(1);
  });
});

describe('the hand-written frontmatter parser refuses what it cannot read', () => {
  // It is hand-written because neither `yaml` nor `js-yaml` is a declared
  // dependency of this repo — both are transitive, so importing one works
  // until an unrelated lockfile change removes it. Strictness is the price.

  it('reads the shape it documents', () => {
    const { frontmatter, errors } = parseFrontmatter(
      '---\nslug: a\nopened: 2026-08-30\npackages:\n  - x\n  - y\ncases:\n  - ILB-0001\n---\n\nbody\n',
    );
    expect(errors).toEqual([]);
    expect(frontmatter.slug).toBe('a');
    expect(frontmatter.packages).toEqual(['x', 'y']);
    expect(frontmatter.cases).toEqual(['ILB-0001']);
  });

  it('accepts `[]` as an explicit empty list', () => {
    // Work that touches no package is normal. The first three intents written
    // under this gate included two, and the parser rejected both.
    const { frontmatter, errors } = parseFrontmatter(
      '---\nslug: a\npackages: []\ncases: []\n---\n\nbody\n',
    );
    expect(errors).toEqual([]);
    expect(frontmatter.packages).toEqual([]);
    expect(frontmatter.cases).toEqual([]);
  });

  it('does not let `[]` leak into the next key list', () => {
    // `packages: []` must CLOSE the list, not leave it open for `cases`
    // items to land in.
    const { frontmatter } = parseFrontmatter(
      '---\npackages: []\ncases:\n  - ILB-0001\n---\n\nbody\n',
    );
    expect(frontmatter.packages).toEqual([]);
    expect(frontmatter.cases).toEqual(['ILB-0001']);
  });

  it('errors on an inline list rather than silently reading none', () => {
    // `packages: [x, y]` is valid YAML and this parser cannot read it. The
    // dangerous outcome is not the error — it is returning `[]`, which makes
    // every package undeclared, or worse, makes drift undetectable.
    const { errors } = parseFrontmatter('---\npackages: [x, y]\n---\n\nbody\n');
    expect(errors.join(' ')).toContain('takes a list');
  });

  it('errors on an unknown key', () => {
    const { errors } = parseFrontmatter(
      '---\nslug: a\nowner: me\n---\n\nbody\n',
    );
    expect(errors.join(' ')).toContain('unknown key `owner`');
  });

  it('errors on a list item with no key', () => {
    const { errors } = parseFrontmatter('---\n  - x\n---\n\nbody\n');
    expect(errors.join(' ')).toContain('outside a list key');
  });

  it('errors when there is no frontmatter at all', () => {
    const { errors } = parseFrontmatter('# just a heading\n');
    expect(errors.join(' ')).toContain('no `---` frontmatter');
  });
});
