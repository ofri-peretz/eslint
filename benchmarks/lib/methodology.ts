/**
 * Squash-proof methodology receipt (roadmap item 1.5, hardened 2026-08-02).
 *
 * `methodologyCommit` records `git rev-parse HEAD` at run start — a *branch*
 * commit. This repo merges with squash, which collapses the branch into one
 * new commit on `main` and drops the originals. The recorded SHA therefore
 * never enters `main`'s history: it resolves on github.com only while the PR
 * ref survives, and is unreachable from a fresh `git clone`. A pre-registration
 * receipt nobody else can resolve is not a receipt.
 *
 * `methodologyHash` fixes that. It is a content hash of the files that define
 * the run's method, so it is independent of merge strategy, survives squash /
 * rebase / force-push, and any reader can recompute it from a clone.
 *
 * ## What the hash covers (v1)
 *
 * The suite entrypoint, plus every repo-local file it statically imports,
 * transitively. Bare specifiers (`eslint`, `node:fs`, …) are excluded — those
 * are pinned by the envelope's `toolchain` block, not by this hash.
 *
 * The rule is deliberately mechanical with no exception list: over-inclusion
 * is conservative (a plumbing edit shows as "method moved"), under-inclusion
 * silently breaks the receipt, which is the failure mode being fixed here.
 *
 * ## Definition — reproduce exactly
 *
 *   sha256( concat( bytes of each path in `methodologyPaths`, in listed order ) )
 *
 * The path list ships in the envelope next to the hash, so the hash is
 * self-describing: an unversioned "hash of some files" is no better than a
 * dead SHA. From a clone, checked out at the revision under audit:
 *
 *   cat $(jq -r '.methodologyPaths[]' <result.json>) | shasum -a 256
 *
 * See benchmarks/README.md §10 "Verifying a published methodology hash".
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');

/** `from '<spec>'` and side-effect `import '<spec>'`. */
const SPEC_RE = /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g;

/** Suites import with explicit extensions; the empty entry handles that. */
const CANDIDATE_EXTS = ['', '.ts', '.mjs', '.js'];

export const METHODOLOGY_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

/** Accepts `import.meta.url`, an absolute path, or a repo-relative path. */
function toAbsolute(fileOrUrl) {
  const raw = String(fileOrUrl);
  const p = raw.startsWith('file:') ? fileURLToPath(raw) : raw;
  return path.isAbsolute(p) ? p : path.resolve(REPO_ROOT, p);
}

function resolveRelativeImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of CANDIDATE_EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Repo-relative paths covered by the hash: the roots (entrypoint first, then
 * any explicit extras) followed by their transitive repo-local imports, sorted
 * for determinism across machines.
 *
 * @param {string} entrypoint       the suite's own file — pass `import.meta.url`
 * @param {string[]} [extraPaths]   method files not reachable by a static import
 * @returns {string[]}
 */
export function collectMethodologyFiles(entrypoint, extraPaths = []) {
  const roots = [toAbsolute(entrypoint), ...extraPaths.map(toAbsolute)];
  const seen = new Set(roots);
  const queue = [...roots];

  while (queue.length > 0) {
    const file = queue.shift();
    let source;
    try {
      source = fs.readFileSync(file, 'utf8');
    } catch {
      continue; // a root that doesn't exist is caught by captureMethodology
    }
    for (const match of source.matchAll(SPEC_RE)) {
      const spec = match[1] ?? match[2];
      // ponytail: static relative specifiers only. A suite that reached for its
      // method through a runtime `import()` / `require()` would fall outside the
      // hash — none do today, and `methodologyPaths` makes the coverage visible.
      if (!spec.startsWith('.')) continue;
      const resolved = resolveRelativeImport(file, spec);
      if (!resolved || seen.has(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }

  const rootRels = roots.map((f) => path.relative(REPO_ROOT, f));
  const rest = [...seen]
    .map((f) => path.relative(REPO_ROOT, f))
    .filter((rel) => !rootRels.includes(rel))
    .sort();
  return [...rootRels, ...rest];
}

/**
 * Build the squash-proof half of the pre-registration receipt.
 *
 * @param {string} entrypoint       the suite's own file — pass `import.meta.url`
 * @param {string[]} [extraPaths]   method files not reachable by a static import
 * @returns {{ methodologyHash: string, methodologyPaths: string[] }}
 */
export function captureMethodology(entrypoint, extraPaths = []) {
  const methodologyPaths = collectMethodologyFiles(entrypoint, extraPaths);
  const hash = createHash('sha256');
  for (const rel of methodologyPaths) {
    hash.update(fs.readFileSync(path.join(REPO_ROOT, rel)));
  }
  return { methodologyHash: `sha256:${hash.digest('hex')}`, methodologyPaths };
}

/**
 * Recompute a published result's hash against the current working tree. Only
 * meaningful when checked out at the revision the result claims — a mismatch
 * against some other revision is expected, not tampering.
 *
 * @param {object} result  envelope with `methodologyHash` + `methodologyPaths`
 * @returns {{ ok: boolean, reason?: string, actual?: string }}
 */
export function verifyMethodologyHash(result) {
  if (!result?.methodologyHash) {
    return { ok: false, reason: 'envelope is missing `methodologyHash`' };
  }
  if (!Array.isArray(result.methodologyPaths) || result.methodologyPaths.length === 0) {
    return { ok: false, reason: 'envelope is missing `methodologyPaths` — the hash is not self-describing' };
  }
  const hash = createHash('sha256');
  for (const rel of result.methodologyPaths) {
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) {
      return { ok: false, reason: `methodologyPaths entry not present in this checkout: ${rel}` };
    }
    hash.update(fs.readFileSync(abs));
  }
  const actual = `sha256:${hash.digest('hex')}`;
  return actual === result.methodologyHash
    ? { ok: true, actual }
    : { ok: false, actual, reason: `methodologyHash mismatch — expected ${result.methodologyHash}, recomputed ${actual}` };
}
