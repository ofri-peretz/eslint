import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  computeStackMedians,
  parseFlagshipSnapshot,
} from '../lib/flagship-snapshot.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function writeSnapshot(results: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'flagship-'));
  dirs.push(dir);
  const path = join(dir, '2026-11-02.json');
  writeFileSync(
    path,
    JSON.stringify({ runAt: '2026-11-02T00:00:00Z', results }),
  );
  return path;
}

const phase = (ms: number, extra: Record<string, number> = {}) => ({
  ms,
  findingsCount: 3,
  ...extra,
});

describe('flagship snapshot: a run whose linter exited fatally', () => {
  const path = () =>
    writeSnapshot([
      {
        rule: 'react-a11y/alt-text',
        repo: 'shadcn-ui',
        runs: {
          oursEslint: {
            cold: phase(262, { exitCode: 2, filesProcessed: 0 }),
            warm: phase(265, { exitCode: 2 }),
          },
          oxlintNative: { cold: phase(146), warm: phase(145) },
        },
      },
      {
        rule: 'jwt/no-algorithm-none',
        repo: 'nestjs',
        runs: {
          oursEslint: {
            cold: phase(1000, { exitCode: 1 }),
            warm: phase(400, { exitCode: 0 }),
          },
        },
      },
    ]);

  it('is removed from the row and listed under failed', () => {
    const row = parseFlagshipSnapshot(path()).results[0];
    expect(row.runs.oursEslint).toEqual({});
    expect(row.failed).toEqual([
      { stack: 'oursEslint', phase: 'cold', exitCode: 2 },
      { stack: 'oursEslint', phase: 'warm', exitCode: 2 },
    ]);
    expect(row.runs.oxlintNative?.cold?.ms).toBe(146);
  });

  it('does not count towards the per-stack median', () => {
    const ours = computeStackMedians(parseFlagshipSnapshot(path())).find(
      (m) => m.stack === 'oursEslint',
    );
    expect(ours?.medianCold).toBe(1000);
    expect(ours?.medianWarm).toBe(400);
  });

  it('leaves exit code 1, which means findings, untouched', () => {
    const row = parseFlagshipSnapshot(path()).results[1];
    expect(row.failed).toBeUndefined();
    expect(row.runs.oursEslint?.cold?.ms).toBe(1000);
  });
});
