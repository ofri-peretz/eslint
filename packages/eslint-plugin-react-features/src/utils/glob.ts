/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A small glob matcher for the `ignore` option of `jsx-pascal-case`.
 *
 * eslint-plugin-react matches each name against minimatch with `noglobstar`.
 * This package ships no runtime dependencies, so the part of minimatch a
 * component name can use is written here: `*`, `?`, `[set]`, `{a,b}` and the
 * extglobs `?(…)`, `*(…)`, `+(…)`, `@(…)` and `!(…)`. A leading `!` negates the
 * whole pattern. A name holds no `/`, so `**` is read as `*`.
 */

/** Escape a character for a regular expression. */
function escapeChar(char: string): string {
  return /[\\^$.*+?()[\]{}|/-]/.test(char) ? `\\${char}` : char;
}

/** Index of the `close` that ends the group opened just before `start`. */
function findClose(
  pattern: string,
  start: number,
  open: string,
  close: string,
): number {
  let depth = 1;
  for (let i = start; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '\\') i++;
    else if (char === open) depth++;
    else if (char === close && --depth === 0) return i;
  }
  return -1;
}

/** Split `body` on `|` (or `,`) at the top level of its own groups. */
function splitTopLevel(body: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '\\') {
      current += char + body.charAt(++i);
      continue;
    }
    if (char === '(' || char === '{') depth++;
    if (char === ')' || char === '}') depth--;
    if (char === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

/** Translate the glob `pattern` into the source of a regular expression. */
function translate(pattern: string): string {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    const next = pattern[i + 1];

    if (char === '\\') {
      out += escapeChar(pattern[++i] ?? '\\');
    } else if ('?*+@!'.includes(char) && next === '(') {
      const close = findClose(pattern, i + 2, '(', ')');
      if (close === -1) {
        out += escapeChar(char);
        continue;
      }
      const alternatives = splitTopLevel(pattern.slice(i + 2, close), '|')
        .map(translate)
        .join('|');
      if (char === '?') out += `(?:${alternatives})?`;
      else if (char === '*') out += `(?:${alternatives})*`;
      else if (char === '+') out += `(?:${alternatives})+`;
      else if (char === '@') out += `(?:${alternatives})`;
      else out += `(?:(?!(?:${alternatives})$)[^/]*?)`;
      i = close;
    } else if (char === '*') {
      while (pattern[i + 1] === '*') i++;
      out += '[^/]*?';
    } else if (char === '?') {
      out += '[^/]';
    } else if (char === '[') {
      const close = pattern.indexOf(']', i + 2);
      if (close === -1) {
        out += '\\[';
        continue;
      }
      let set = pattern.slice(i + 1, close);
      if (set[0] === '!' || set[0] === '^') set = `^${set.slice(1)}`;
      out += `[${set.replace(/\\(?!\])/g, '\\\\')}]`;
      i = close;
    } else if (char === '{') {
      const close = findClose(pattern, i + 1, '{', '}');
      const alternatives =
        close === -1 ? [] : splitTopLevel(pattern.slice(i + 1, close), ',');
      if (alternatives.length < 2) {
        out += '\\{';
        continue;
      }
      out += `(?:${alternatives.map(translate).join('|')})`;
      i = close;
    } else {
      out += escapeChar(char);
    }
  }
  return out;
}

const cache = new Map<string, RegExp>();

/** Does `name` match the glob `pattern`? A leading `!` negates the match. */
export function globMatch(name: string, pattern: string): boolean {
  let negate = false;
  let body = pattern;
  while (body.startsWith('!') && body[1] !== '(') {
    negate = !negate;
    body = body.slice(1);
  }
  let regex = cache.get(body);
  if (!regex) {
    regex = new RegExp(`^(?:${translate(body)})$`);
    cache.set(body, regex);
  }
  return regex.test(name) !== negate;
}
