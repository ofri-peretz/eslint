/**
 * @provenBy {"file":".agent/dependency-ledger.json","find":"\"vitest\": \"the only test runner\"","replace":"\"vitest-gone\": \"the only test runner\""}
 */

/*
 * Every dependency is a decision, written down.
 *
 * docs/intents/2026-11-03-our-code-owns-the-tree: we depend on core technology
 * only, and own the rest. That holds only while nobody can add a package
 * without saying which kind it is. So every external name in every workspace
 * `package.json` must have a line in `.agent/dependency-ledger.json`:
 *
 *   core       — technology we build on (linters, toolchain, docs framework,
 *                real algorithms)
 *   subject    — an API our rules lint, or a competitor we benchmark
 *   owned-soon — scheduled to be replaced by our own code or `node:`
 *
 * A ledger line with no declaration behind it fails too, so a removal has to
 * take its line with it and `owned-soon` visibly shrinks.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const KINDS = ['core', 'subject', 'owned-soon'] as const;
const FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];
// Corpora and fixtures are code we lint, not code we run.
const NOT_A_WORKSPACE = /corpus|fixtures|\/test\/|\.real-source/;

const ledger = JSON.parse(
  fs.readFileSync('.agent/dependency-ledger.json', 'utf8'),
) as Record<string, Record<string, string>>;

function declared(): Map<string, string[]> {
  const files = execFileSync('git', ['ls-files', '*package.json'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((f) => f && !NOT_A_WORKSPACE.test(f));
  const manifests = files.map((f) => ({
    f,
    p: JSON.parse(fs.readFileSync(f, 'utf8')),
  }));
  const ours = new Set(manifests.map(({ p }) => p.name));
  const names = new Map<string, string[]>();
  for (const { f, p } of manifests) {
    for (const field of FIELDS) {
      for (const name of Object.keys(p[field] ?? {})) {
        if (ours.has(name)) continue;
        names.set(name, [...(names.get(name) ?? []), f]);
      }
    }
  }
  return names;
}

describe('dependency ledger', () => {
  const names = declared();
  const entries = KINDS.flatMap((kind) =>
    Object.entries(ledger[kind] ?? {}).map(([name, reason]) => ({
      kind,
      name,
      reason,
    })),
  );

  it('has only the three kinds', () => {
    expect(
      Object.keys(ledger)
        .filter((k) => k !== '$comment')
        .sort(),
    ).toEqual([...KINDS].sort());
  });

  it('records every declared dependency', () => {
    const recorded = new Set(entries.map((e) => e.name));
    const missing = [...names]
      .filter(([n]) => !recorded.has(n))
      .map(([n, fs]) => `${n} (${fs.join(', ')})`);
    expect(
      missing,
      'add each to .agent/dependency-ledger.json as core, subject or owned-soon',
    ).toEqual([]);
  });

  it('records nothing that is no longer declared', () => {
    const stale = entries
      .filter((e) => !names.has(e.name))
      .map((e) => `${e.kind}: ${e.name}`);
    expect(stale, 'a removed dependency takes its ledger line with it').toEqual(
      [],
    );
  });

  it('gives each name one kind and a reason', () => {
    const seen = new Map<string, string>();
    const problems: string[] = [];
    for (const { kind, name, reason } of entries) {
      if (seen.has(name))
        problems.push(`${name} is both ${seen.get(name)} and ${kind}`);
      seen.set(name, kind);
      if (!reason.trim()) problems.push(`${name} has no reason`);
    }
    expect(problems).toEqual([]);
  });
});
