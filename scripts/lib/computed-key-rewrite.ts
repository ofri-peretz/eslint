/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The computed-key rewrite: `obj.m()` -> `obj["m"]()`, `obj.p` -> `obj["p"]`,
 * `{ k: v }` -> `{ ['k']: v }`.
 *
 * Extracted from `scripts/find-computed-key-blind-spots.mts` so it can be
 * tested. The probe is a CLI with top-level `await`, so importing it runs the
 * whole scan — which is why the rewrite went untested long enough to ship a
 * regex-literal bug that CORRUPTS the fixtures it rewrites rather than
 * skipping them.
 */

/**
 * A string or template literal, matched so it can be passed through UNTOUCHED.
 *
 * Without this the read rewrite reached inside literals and produced fictions:
 * `spawn('cmd.exe', …)` became `spawn('cmd["exe"]', …)`, and a JWT fixture's
 * `eyJ…J9.eyJ…` payload was rewritten mid-token. Both then "went silent", and
 * both would have been reported as rule blind spots. The rewrite has to know
 * what is code and what is data, or it manufactures exactly the defect it
 * exists to detect.
 *
 * REGEX literals are data too, and cost a second false report before they were
 * added: `res.redirect(/^https:\/\/a\.example\.com/)` became
 * `a["example"]` inside the pattern. They need the lookbehind because `/` is
 * also division — only a slash in operand position can open a regex.
 *
 * "Operand position" is not only punctuation. A KEYWORD puts the parser there
 * too, and the punctuation-only lookbehind missed every one of them:
 *
 *     const re = /foo.bar/     recognised
 *     return /foo.bar/         NOT recognised
 *     typeof /foo.bar/         NOT recognised
 *     case /foo.bar/.source:   NOT recognised
 *
 * A miss here is NOT the safe direction, which is what the previous note
 * claimed. An unrecognised regex is not protected as a literal, so the rewrite
 * runs INSIDE its pattern and `return /foo.bar/` becomes
 * `return /foo["bar"]/` — a different pattern, matching different text, in a
 * fixture the probe then judges. That manufactures blind spots rather than
 * missing them.
 *
 * The keyword list is the set that can be followed by an expression. `)` and
 * `]` stay out: after them a slash is division (`(a+b) / 2`).
 */
export const REGEX_OPENS =
  '(?:[(,=:[!&|?{};]|\\b(?:return|typeof|case|in|of|do|else|yield|await|delete|void|instanceof|new))';
export const LITERAL = new RegExp(
  "'(?:\\\\.|[^'\\\\])*'" +
    '|"(?:\\\\.|[^"\\\\])*"' +
    '|`(?:\\\\.|[^`\\\\])*`' +
    `|(?<=${REGEX_OPENS}\\s*)\\/(?:[^/\\\\\\n[]|\\\\.|\\[(?:[^\\]\\\\]|\\\\.)*\\])+\\/[gimsuy]*`,
);

/**
 * An object literal KEY: `{ k: v }` -> `{ ['k']: v }`.
 *
 * The same property under both spellings, and the second is what a minifier
 * emits. `check:spellings` counts 195 sites reading a bare object key — the
 * largest of its three classes — and none of them was reachable by this probe,
 * which rewrote member access only. "1 rule goes silent" described the 117
 * dotted-property sites and said nothing about the 195.
 *
 * Two shapes are deliberately excluded because the rewrite would change
 * meaning rather than spelling:
 *   - a key followed by `(` is a method shorthand, `{ k() {} }`, where
 *     `{ ['k']() {} }` is valid but the rewrite below would produce `['k']:`
 *   - shorthand `{ k }` is a BINDING, not a property, and has no equivalent
 *
 * Requires the key to be preceded by `{` or `,` so a ternary's `? a : b` and a
 * type annotation's `x: T` are not mistaken for object keys.
 */
const KEY_SITE = /([{,]\s*)([A-Za-z_$][\w$]*)\s*:(?!\s*:)/;

const CALL_SITE =
  /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)\(/;
const READ_SITE =
  /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)\b(?!\s*[(.])/;

export function rewriteOutsideLiterals(
  code: string,
  site: RegExp,
  render: (receiver: string, name: string) => string,
): string {
  const combined = new RegExp(`${LITERAL.source}|${site.source}`, 'g');
  return code.replace(combined, (match, receiver?: string, name?: string) =>
    receiver === undefined || name === undefined
      ? match // a literal: data, not code
      : render(receiver, name),
  );
}

/**
 * Does this case deliberately CONTRAST the two spellings?
 *
 * `no-improper-type-validation` owns
 *
 *     if (bag["k"] !== null && typeof bag.k === "object") { go(); }
 *
 * and it fires precisely BECAUSE the two operands are spelled differently: the
 * rule cannot prove the subscripted guard covers the dotted use, so it refuses
 * to treat the value as null-checked. Normalising both to `bag["k"]` makes the
 * guard match, the rule correctly falls silent, and the probe reads that as a
 * blind spot — when what actually happened is that the rewrite destroyed the
 * only thing the case was testing.
 *
 * So: a case containing BOTH `x["k"]` and `x.k` for the same member is asking
 * a question about the difference, and this probe has no business erasing it.
 * Narrow on purpose — 3% of TP cases contain a static subscript somewhere, and
 * excluding all of them would throw away the cases that pin the subscripted
 * spelling as reportable, which are the whole point of the sweep.
 */
export function contrastsSpellings(code: string): boolean {
  const subscripts = code.matchAll(
    /([A-Za-z_$][\w$]*)\s*\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]/g,
  );
  for (const [, receiver, key] of subscripts) {
    if (new RegExp(`\\b${receiver}\\s*\\.\\s*${key}\\b`).test(code))
      return true;
  }
  return false;
}

export function toComputed(code: string): string {
  const calls = rewriteOutsideLiterals(
    code,
    CALL_SITE,
    (r, m) => `${r}["${m}"](`,
  );
  const reads = rewriteOutsideLiterals(
    calls,
    READ_SITE,
    (r, p) => `${r}["${p}"]`,
  );
  return rewriteOutsideLiterals(
    reads,
    KEY_SITE,
    (prefix, k) => `${prefix}['${k}']:`,
  );
}
