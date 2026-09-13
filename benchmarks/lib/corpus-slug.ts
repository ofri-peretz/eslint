/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The part of a parity envelope's filename that says WHICH corpus it measured.
 *
 * Envelopes were keyed on the date alone, so running the two corpora worth
 * running — the curated fixtures and the harvested real-world tree — had the
 * second overwrite the first. Adding the corpus basename fixed that case and
 * left a smaller one: `--corpus` takes any path, and two different corpora can
 * share a basename (`benchmarks/corpus/CWE-089` and `other/corpus/CWE-089`),
 * which collapses them back onto one filename.
 *
 * So the slug is derived from the path RELATIVE TO THE REPOSITORY, not the
 * basename and not the absolute path:
 *
 *   - the basename is not unique, which is the bug above;
 *   - the absolute path is not stable. `CORPUS` is `path.resolve`d, so hashing
 *     it would name the same corpus differently on every machine, and CI and a
 *     laptop would write two envelopes for one measurement. A result that
 *     cannot be compared across checkouts is barely a result.
 *
 * A corpus outside the repository has no relative identity worth reading, so it
 * falls back to the basename plus a short digest of the absolute path. That IS
 * machine-specific, and correctly so: such a corpus is machine-specific too.
 */
import crypto from 'node:crypto';
import path from 'node:path';

/** Filesystem-safe, lowercase, no separators. */
const slugify = (s: string): string =>
  s
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

/** Keep filenames sane when a corpus sits deep in the tree. */
const MAX_SLUG = 60;

export function corpusSlug(corpusPath: string, repoRoot: string): string {
  const rel = path.relative(repoRoot, corpusPath);
  const inside = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);

  if (!inside) {
    const digest = crypto
      .createHash('sha256')
      .update(corpusPath)
      .digest('hex')
      .slice(0, 8);
    return `${slugify(path.basename(corpusPath))}-${digest}`;
  }

  const full = slugify(rel.split(path.sep).join('-'));
  if (full.length <= MAX_SLUG) return full;

  // Truncating alone would reintroduce collisions between two long paths that
  // share a prefix, so the digest is of the whole relative path and travels
  // with the truncation.
  const digest = crypto
    .createHash('sha256')
    .update(rel)
    .digest('hex')
    .slice(0, 8);
  return `${full.slice(0, MAX_SLUG)}-${digest}`;
}
