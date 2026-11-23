#!/usr/bin/env node
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `test-integrity-diff [--base <ref>]` — the changed-lines checks, for a
 * lefthook `pre-push` step:
 *
 * ```yaml
 * pre-push:
 *   commands:
 *     test-integrity:
 *       run: npx test-integrity-diff --base origin/main
 * ```
 *
 * Exits 1 when a finding is reported, 2 when git cannot answer.
 */

import { execFileSync } from 'node:child_process';

import {
  parseUnifiedDiff,
  unexplainedSnapshots,
  weakenedAssertions,
} from './checks';
import type { Finding } from './checks';

export type Git = (args: string[]) => string;

export const defaultGit: Git = (args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

export function parseArgs(argv: string[]): { base: string } {
  const at = argv.indexOf('--base');
  return { base: at >= 0 && argv[at + 1] ? argv[at + 1] : 'origin/main' };
}

export function check(base: string, git: Git): Finding[] {
  const diff = git(['diff', '--unified=0', '--no-color', `${base}...HEAD`]);
  const paths = git(['diff', '--name-only', `${base}...HEAD`])
    .split('\n')
    .filter(Boolean);
  const messages = git(['log', '--format=%B', `${base}..HEAD`]);
  return [
    ...weakenedAssertions(parseUnifiedDiff(diff), messages),
    ...unexplainedSnapshots(paths, messages),
  ];
}

export function run(
  argv: string[],
  git: Git,
  write: (line: string) => void,
): number {
  const { base } = parseArgs(argv);
  let findings: Finding[];
  try {
    findings = check(base, git);
  } catch (error) {
    write(
      `test-integrity-diff: git could not compare against ${base}: ${(error as Error).message}`,
    );
    return 2;
  }
  for (const f of findings) {
    write(`${f.path}:${f.line} ${f.check} ${f.message}`);
  }
  return findings.length > 0 ? 1 : 0;
}

/* c8 ignore start -- the process entry point; `run` above is what is tested */
if (require.main === module) {
  process.exitCode = run(process.argv.slice(2), defaultGit, (line) =>
    process.stderr.write(`${line}\n`),
  );
}
/* c8 ignore stop */
