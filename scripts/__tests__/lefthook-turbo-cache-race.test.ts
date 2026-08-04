/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: no lefthook hook may run two turbo processes against one cache.
 *
 * `pre-push` is `parallel: true`. When two of its commands each invoked
 * `turbo run ...`, both processes wrote `.turbo/cache` simultaneously, raced,
 * and one died with `IO error: Operation not permitted (os error 1)` — *after*
 * every task it scheduled had succeeded. The gate reported a red `build` with
 * zero real failures, and the half-written entry meant the next run rebuilt
 * from cold and could race again.
 *
 * That failure mode is unusually expensive to diagnose, because re-running the
 * same command by hand always passes: one turbo process never collides with
 * itself. It reads as a flake.
 *
 * The invariant: within a single parallel hook, at most one command may invoke
 * turbo, UNLESS each invocation names its own `--cache-dir`. Both shapes are
 * safe; anything else is the bug coming back.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEFTHOOK = resolve(__dirname, '..', '..', 'lefthook.yml');

/**
 * `{ hookName: [command text, ...] }` — a deliberately small YAML reader.
 *
 * Block scalars have to be expanded, not skipped. `run: |` puts nothing on the
 * `run:` line itself; the command lives in the indented block beneath it. An
 * earlier version of this parser captured the literal `"|"` for those, so
 * `tests-affected` — which is a block scalar containing `turbo run test` —
 * was invisible to every assertion below. A lock that cannot see half the
 * commands it guards is the vacuous-lock failure this file exists to prevent.
 */
export function parseHookCommands(yaml: string): Record<string, string[]> {
  const hooks: Record<string, string[]> = {};
  let hook: string | null = null;
  const lines = yaml.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*#/.test(line) || line.trim() === '') continue;

    // Top-level key with no indentation is a hook name (`pre-push:`).
    const hookMatch = /^([a-z-]+):\s*$/.exec(line);
    if (hookMatch) {
      hook = hookMatch[1]!;
      hooks[hook] ??= [];
      continue;
    }
    if (hook === null) continue;

    const runMatch = /^(\s+)run:\s*(.*)$/.exec(line);
    if (!runMatch) continue;
    const [, indent, rest] = runMatch as unknown as [string, string, string];

    // Inline form: `run: some command`.
    if (rest.trim() !== '' && !/^[|>][-+\d]*$/.test(rest.trim())) {
      hooks[hook]!.push(rest.trim());
      continue;
    }

    // Block form: consume every line indented deeper than the `run:` key.
    const body: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j]!;
      if (next.trim() === '') continue;
      const nextIndent = /^(\s*)/.exec(next)![1]!.length;
      if (nextIndent <= indent.length) break;
      body.push(next.trim());
      i = j;
    }
    hooks[hook]!.push(body.join('\n'));
  }
  return hooks;
}

/** Commands that start a turbo process. */
export function turboInvocations(commands: readonly string[]): string[] {
  return commands.filter((c) => /\bturbo\s+run\b/.test(c));
}

/** Does every invocation isolate its cache? Then concurrency is safe. */
export function allCacheDirsDistinct(invocations: readonly string[]): boolean {
  const dirs = invocations.map((c) => /--cache-dir[= ]([^\s]+)/.exec(c)?.[1]);
  if (dirs.some((d) => d === undefined)) return false;
  return new Set(dirs).size === dirs.length;
}

describe('lefthook: no two turbo processes share one cache', () => {
  const hooks = parseHookCommands(readFileSync(LEFTHOOK, 'utf-8'));

  it('parses the hooks it is meant to guard', () => {
    // A silently-empty parse would make every assertion below vacuous — the
    // exact "green having verified nothing" shape this repo keeps hitting.
    expect(Object.keys(hooks)).toContain('pre-push');
    expect(hooks['pre-push']!.length).toBeGreaterThan(5);
  });

  for (const hook of ['pre-commit', 'pre-push']) {
    it(`${hook}: at most one turbo invocation, or one cache dir each`, () => {
      const invocations = turboInvocations(hooks[hook] ?? []);
      if (invocations.length <= 1) return;
      expect(
        allCacheDirsDistinct(invocations),
        `${hook} runs ${invocations.length} turbo processes in parallel against a shared cache:\n` +
          invocations.map((c) => `  ${c}`).join('\n') +
          '\nMerge them into one `turbo run a b` or give each its own --cache-dir.',
      ).toBe(true);
    });
  }

  it('still builds and tests', () => {
    const prePush = hooks['pre-push']!.join('\n');
    expect(prePush).toMatch(/turbo\s+run\s+[^\n]*\bbuild\b/);
    expect(prePush).toMatch(/turbo\s+run\s+[^\n]*\btest\b/);
  });

  /**
   * The same race one layer down.
   *
   * Every shim in tools/oxlint-plugins `require()`s `<pkg>/dist/src/index.js`,
   * so `oxlint:shims:verify` reads precisely the tree the build writes. As its
   * own parallel command it failed in ~2s having read a file mid-write, with
   * no output at all — a silent abort with nothing to debug.
   *
   * It must therefore share a command with the build (sequenced by `&&`), not
   * sit beside it.
   */
  it('no parallel command reads dist/ while the build writes it', () => {
    const commands = hooks['pre-push'] ?? [];
    const consumers = commands.filter((c) => DIST_CONSUMERS.some((s) => c.includes(s)));
    for (const cmd of consumers) {
      expect(
        /turbo\s+run\s+[^\n]*\bbuild\b[^\n]*&&/.test(cmd),
        `\`${cmd}\` reads <pkg>/dist but does not run after the build in the same command. ` +
          'Chain it with `&&` onto the build command, or it will read a half-written dist.',
      ).toBe(true);
    }
  });
});

/** pre-push scripts that load built output rather than source. */
const DIST_CONSUMERS = ['oxlint:shims:verify'];

describe('the lock itself', () => {
  it('flags two bare invocations', () => {
    expect(
      allCacheDirsDistinct(['turbo run build', 'turbo run test']),
    ).toBe(false);
  });

  it('accepts distinct cache dirs', () => {
    expect(
      allCacheDirsDistinct([
        'turbo run build --cache-dir=.turbo/a',
        'turbo run test --cache-dir=.turbo/b',
      ]),
    ).toBe(true);
  });

  it('rejects the same cache dir named twice', () => {
    expect(
      allCacheDirsDistinct([
        'turbo run build --cache-dir=.turbo/a',
        'turbo run test --cache-dir=.turbo/a',
      ]),
    ).toBe(false);
  });

  it('only counts real turbo invocations', () => {
    expect(turboInvocations(['npm run lint:md', 'echo turbo'])).toEqual([]);
    expect(turboInvocations(['npx --no turbo run build'])).toHaveLength(1);
  });

  it('ignores comments and blank lines when parsing', () => {
    const hooks = parseHookCommands(['# comment', '', 'pre-push:', '  a:', '    run: echo hi'].join('\n'));
    expect(hooks['pre-push']).toEqual(['echo hi']);
  });

  // Regression: `run: |` puts nothing on the `run:` line. Capturing the literal
  // `"|"` made every command written as a block scalar invisible to the
  // assertions above — including `tests-affected`, which invokes turbo.
  it('expands block scalars instead of capturing the pipe', () => {
    const hooks = parseHookCommands(
      [
        'pre-commit:',
        '  tests-affected:',
        '    run: |',
        '      if git rev-parse --quiet origin/main; then',
        '        npx --no turbo run test --filter="...[origin/main]"',
        '      fi',
        '  other:',
        '    run: echo done',
      ].join('\n'),
    );
    const commands = hooks['pre-commit']!;
    expect(commands).toHaveLength(2);
    expect(commands[0]).toContain('turbo run test');
    expect(commands[0]).not.toBe('|');
    expect(commands[1]).toBe('echo done');
  });

  it('sees a turbo invocation hidden inside a block scalar', () => {
    const hooks = parseHookCommands(
      ['pre-push:', '  a:', '    run: npx turbo run build', '  b:', '    run: |', '      npx turbo run test'].join('\n'),
    );
    // Two separate turbo processes — the very thing this file guards — and the
    // old parser reported only one.
    expect(turboInvocations(hooks['pre-push'] ?? [])).toHaveLength(2);
  });

  it('stops the block at the next key rather than swallowing the file', () => {
    const hooks = parseHookCommands(
      ['pre-push:', '  a:', '    run: |', '      echo one', '  b:', '    run: echo two'].join('\n'),
    );
    expect(hooks['pre-push']).toEqual(['echo one', 'echo two']);
  });

  it('ignores run: lines that appear before any hook', () => {
    expect(parseHookCommands('    run: echo orphan')).toEqual({});
  });
});
