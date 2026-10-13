/**
 * How a finding is identified when ESLint's and oxlint's outputs are compared.
 *
 * Almost every rule reports a fact about a LINE, so a finding is
 * (file, rule, line, column) and two engines agree when those tuples match.
 *
 * A project-scoped rule reports a fact about a PROJECT. `node-security/lock-file`
 * ("this project has no lock file") reports it once per package.json root and
 * suppresses it on every other file, through module-level state. Which file
 * carries the finding is whichever one the engine happens to lint first — and
 * neither engine lints in a fixed order:
 *
 *   - ESLint reads every file with `Promise.all` and lints each as its read
 *     resolves (`lintFilesWithoutMultithreading`, eslint/lib/eslint/eslint.js),
 *     so the order is the filesystem's.
 *   - oxlint walks and parses on a Rust thread pool and hands files to the JS
 *     plugin host as each thread finishes.
 *
 * Measured on one 60-file project, identical input, 30 runs each: ESLint put
 * the finding on 4 different files, oxlint on 9. Every run had exactly one.
 * Keyed by file, that is a divergence on the runs where the two schedulers
 * disagree and agreement on the rest — which is what the weekly job printed in
 * 2 of 4 scheduled runs (38154358916, 35515111168): the same finding on
 * lock-file/safe/case-03.js under one engine and lock-file/vulnerable/case-01.js
 * under the other, swapping sides between runs.
 *
 * So a project-scoped finding is keyed by its PROJECT, plus its occurrence
 * index within that project. The index keeps the count honest: if a host ever
 * lost the dedup state between files (one module instance per file or per
 * worker), it would report once per file, and the second occurrence has no
 * counterpart on the other side.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Rules whose finding is about the project, not the line it lands on. The rule
 * must dedupe on the same root `projectOf` computes — nearest package.json.
 */
export const PROJECT_SCOPED_RULES: ReadonlySet<string> = new Set([
  'node-security/lock-file',
]);

export interface Finding {
  /** Repo-relative, `/`-separated. */
  file: string;
  rule: string;
  line: number;
  column: number;
}

/**
 * The nearest directory at or above `file` holding a package.json, repo-
 * relative and `/`-separated (`''` for the repo root). The same walk the rule
 * does to pick its dedup key. Undefined when no manifest exists all the way up.
 */
export function projectOf(file: string, repoRoot: string): string | undefined {
  let dir = path.dirname(path.resolve(repoRoot, file));
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return path.relative(repoRoot, dir).split(path.sep).join('/');
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Comparison keys for one engine's findings, index-aligned with the input.
 */
export function findingKeys(
  findings: readonly Finding[],
  repoRoot: string,
): string[] {
  const seen = new Map<string, number>();
  return findings.map((f) => {
    if (PROJECT_SCOPED_RULES.has(f.rule)) {
      const project = projectOf(f.file, repoRoot);
      if (project !== undefined) {
        const base = `${project === '' ? '.' : project}/package.json::${f.rule}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return `${base}::project#${n}`;
      }
    }
    return `${f.file}::${f.rule}::${f.line}::${f.column}`;
  });
}

export interface ParityDiff<F extends Finding> {
  shared: number;
  eslintOnly: F[];
  oxlintOnly: F[];
}

export function diffFindings<F extends Finding>(
  eslintFindings: readonly F[],
  oxlintFindings: readonly F[],
  repoRoot: string,
): ParityDiff<F> {
  const eKeys = findingKeys(eslintFindings, repoRoot);
  const oKeys = findingKeys(oxlintFindings, repoRoot);
  const eSet = new Set(eKeys);
  const oSet = new Set(oKeys);
  return {
    shared: [...eSet].filter((k) => oSet.has(k)).length,
    eslintOnly: eslintFindings.filter((_, i) => !oSet.has(eKeys[i])),
    oxlintOnly: oxlintFindings.filter((_, i) => !eSet.has(oKeys[i])),
  };
}
