/**
 * lock-file — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/lock_file.qnt): the
 * module-level dedupe reported a missing lock file at most once per PROCESS,
 * keyed by root alone. In an editor or `eslint_d` session it was never
 * reported again, and a second `packageManager` was never checked.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'lock-file-runs-'));
  mkdirSync(join(projectDir, '.git'), { recursive: true });
  mkdirSync(join(projectDir, 'src'), { recursive: true });
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0' }),
  );
  writeFileSync(join(projectDir, 'package-lock.json'), '{}');
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

interface Visitor {
  Program?: (node: unknown) => void;
}

/** One lint run over `files` of the project; returns the report count. */
async function lintRun(
  rule: { create: (context: unknown) => Visitor },
  files: readonly string[],
  packageManager: string,
): Promise<number> {
  let reports = 0;
  for (const name of files) {
    rule
      .create({
        filename: join(projectDir, 'src', name),
        options: [{ packageManager }],
        report: () => {
          reports++;
        },
      })
      .Program?.({ type: 'Program' });
  }
  return reports;
}

describe('lock-file reports once per lint run, not once per process', () => {
  it('a second run in the same process reports the missing lock file again', async () => {
    vi.resetModules();
    const { lockFile } = await import('./index');
    const rule = lockFile as unknown as { create: (c: unknown) => Visitor };
    const files = ['a.ts', 'b.ts', 'c.ts'];
    expect(await lintRun(rule, files, 'yarn')).toBe(1);
    expect(await lintRun(rule, files, 'yarn')).toBe(1);
  });

  it('a different packageManager on the same root is checked on its own', async () => {
    vi.resetModules();
    const { lockFile } = await import('./index');
    const rule = lockFile as unknown as { create: (c: unknown) => Visitor };
    expect(await lintRun(rule, ['a.ts'], 'any')).toBe(0);
    expect(await lintRun(rule, ['a.ts'], 'yarn')).toBe(1);
    expect(await lintRun(rule, ['a.ts'], 'pnpm')).toBe(1);
    expect(await lintRun(rule, ['a.ts'], 'yarn')).toBe(1);
  });
});
