/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The file-pattern options (`allowInFiles`, `allowPatterns`, `ignoreFiles`,
 * `exceptions`, `allow`) all take the same value: a glob, or a plain
 * substring.
 *
 *   - A pattern with no `*` or `?` matches when the path contains it
 *     (`legacy/` matches every file under any `legacy` folder).
 *   - A glob matches any run of whole path segments: `src/**` and `**` +
 *     `/*.config.ts` match an absolute filename as well as a relative one, and
 *     `*legacy*` matches a `legacy` folder anywhere. `**` spans segments, `*`
 *     and `?` stay within one.
 *
 * ESLint hands rules absolute filenames, so a glob anchored at the start of
 * the string never matched anything there; each rule carried its own
 * translation, and two of them turned `**` into a pattern that could not
 * cross a `/`.
 */
const cache = new Map<string, RegExp>();

function toRegExp(glob: string): RegExp {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      // `**/` may match no segment at all.
      if (glob[i + 2] === '/') {
        out += '(?:.*/)?';
        i += 2;
      } else {
        out += '.*';
        i += 1;
      }
    } else if (c === '*') {
      out += '[^/]*';
    } else if (c === '?') {
      out += '[^/]';
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`(?:^|/)${out}(?:/|$)`);
}

/** Does `filename` match the file pattern `pattern`? */
export function matchesFilePattern(filename: string, pattern: string): boolean {
  const file = filename.replace(/\\/g, '/');
  if (!/[*?]/.test(pattern)) return file.includes(pattern);
  let re = cache.get(pattern);
  if (!re) {
    re = toRegExp(pattern);
    cache.set(pattern, re);
  }
  return re.test(file);
}

/** Does `filename` match any of `patterns`? */
export const matchesAnyFilePattern = (
  filename: string,
  patterns: readonly string[],
): boolean => patterns.some((p) => matchesFilePattern(filename, p));
