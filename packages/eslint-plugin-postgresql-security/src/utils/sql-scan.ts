/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * sql-scan.ts — one left-to-right pass over SQL text.
 *
 * Three rules used a global regex with an unbounded lazy body to find the
 * spans that are not executable SQL — `/\*[\s\S]*?\*\/`, `'(?:[^']|'')*'`,
 * `$tag$[\s\S]*?$tag$`. Each of those scans to the end of the input when the
 * construct is never closed, and `String.replace` with `/g` then retries one
 * character further along, so a query text full of unterminated `/*` costs
 * O(n²) (`js/polynomial-redos`). The input is a string literal out of the file
 * being linted, so its shape is the author's, not ours.
 *
 * A scanner has no such cliff: every character is visited once, and an
 * unterminated construct ends the scan instead of restarting it.
 *
 * Behaviour is deliberately identical to the alternations it replaces,
 * including the parts that are arguably wrong:
 *
 *   - An UNTERMINATED construct is not a span. The regexes simply failed to
 *     match, leaving the text in place, and a rule that suddenly started
 *     blanking the tail of a malformed query would change what it reports.
 *   - Block comments do not nest. The first `*\/` closes, as `[\s\S]*?` did.
 *   - `stripComments` does not know about string literals, exactly as
 *     `/--[^\n]*|\/\*[\s\S]*?\*\//g` did not — `'--'` inside a quoted string
 *     is still treated as a comment there.
 */

/** A span of `text` that is not executable SQL. */
interface Span {
  readonly start: number;
  /** Exclusive. */
  readonly end: number;
}

/**
 * `indexOf`, with the failures remembered.
 *
 * Every construct here ends at a fixed terminator, and the scan restarts one
 * character later whenever a construct turns out to be unterminated. A plain
 * `indexOf` then re-reads the whole tail on each restart, which reproduces in
 * the scanner exactly the O(n²) the regexes had: `'/* '.repeat(20_000)` took
 * 1.5s that way, and 5ms this way.
 *
 * `indexOf` is monotone in its start — if a needle is absent from `from`, it is
 * absent from anything after `from` — so one recorded failure answers every
 * later question about that needle for free.
 */
function memoIndexOf(text: string): (needle: string, from: number) => number {
  const absentFrom = new Map<string, number>();
  return (needle, from) => {
    const known = absentFrom.get(needle);
    if (known !== undefined && from >= known) return -1;
    const at = text.indexOf(needle, from);
    if (at === -1) absentFrom.set(needle, Math.min(known ?? from, from));
    return at;
  };
}

type Find = (needle: string, from: number) => number;

/** The end of a `--` line comment starting at `i`, or `null` if this is not one. */
function lineComment(text: string, i: number, find: Find): number | null {
  if (text[i + 1] !== '-') return null;
  const newline = find('\n', i + 2);
  return newline === -1 ? text.length : newline;
}

/** The end of a `/* … *\/` block comment starting at `i`, or `null`. */
function blockComment(text: string, i: number, find: Find): number | null {
  if (text[i + 1] !== '*') return null;
  const close = find('*/', i + 2);
  // Unterminated: the regex did not match either, so this is not a span.
  return close === -1 ? null : close + 2;
}

/**
 * The end of a `'…'` / `"…"` quoted run starting at `i`, or `null`.
 *
 * A doubled quote is an escaped quote, not a close — `'it''s'` is one string.
 *
 * Jumps quote to quote rather than character to character, so the cost is the
 * number of quote characters rather than the length of the text.
 */
function quoted(
  text: string,
  i: number,
  quote: string,
  find: Find,
): number | null {
  let at = i + 1;
  for (;;) {
    const next = find(quote, at);
    if (next === -1) return null;
    if (text[next + 1] === quote) {
      at = next + 2;
      continue;
    }
    return next + 1;
  }
}

/** The tag of a dollar quote opening at `i` (`$$` → `''`), or `null`. */
function dollarTag(text: string, i: number): string | null {
  let at = i + 1;
  if (/[A-Za-z_]/.test(text[at] ?? '')) {
    at += 1;
    while (/\w/.test(text[at] ?? '')) at += 1;
  }
  return text[at] === '$' ? text.slice(i + 1, at) : null;
}

/** The end of a `$tag$ … $tag$` body starting at `i`, or `null`. */
function dollarQuoted(text: string, i: number, find: Find): number | null {
  const tag = dollarTag(text, i);
  if (tag === null) return null;
  const delimiter = `$${tag}$`;
  const close = find(delimiter, i + delimiter.length);
  return close === -1 ? null : close + delimiter.length;
}

/** The span opening at `i`, if any — the leftmost-first order the alternations had. */
function spanAt(
  text: string,
  i: number,
  includeQuoted: boolean,
  find: Find,
): number | null {
  const character = text[i];
  if (character === '-') return lineComment(text, i, find);
  if (character === '/') return blockComment(text, i, find);
  if (!includeQuoted) return null;
  if (character === "'" || character === '"')
    return quoted(text, i, character, find);
  if (character === '$') return dollarQuoted(text, i, find);
  return null;
}

/**
 * Every non-executable span, left to right.
 *
 * @param includeQuoted whether string constants, quoted identifiers and
 *   dollar-quoted bodies count — comments always do.
 */
function spans(text: string, includeQuoted: boolean): Span[] {
  const find = memoIndexOf(text);
  const found: Span[] = [];
  let i = 0;

  while (i < text.length) {
    const end = spanAt(text, i, includeQuoted, find);
    if (end === null) {
      i += 1;
      continue;
    }
    found.push({ start: i, end });
    i = end;
  }

  return found;
}

/** Replace each span with `filler` — the span collapses to it. */
function replaceSpans(text: string, found: Span[], filler: string): string {
  if (found.length === 0) return text;
  const out: string[] = [];
  let at = 0;
  for (const span of found) {
    out.push(text.slice(at, span.start), filler);
    at = span.end;
  }
  out.push(text.slice(at));
  return out.join('');
}

/** `text` with every SQL comment removed. */
export function stripComments(text: string): string {
  return replaceSpans(text, spans(text, false), '');
}

/**
 * `text` with every span that cannot contain a bind parameter blanked to a
 * single space — comments, string constants, quoted identifiers and
 * dollar-quoted bodies.
 */
export function blankNonPlaceholderText(text: string): string {
  return replaceSpans(text, spans(text, true), ' ');
}
