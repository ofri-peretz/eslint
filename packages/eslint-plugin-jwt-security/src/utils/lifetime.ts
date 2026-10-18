/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * How long a token lives, read statically — for `require-expiration`'s
 * `maxExpirationSeconds`.
 *
 * Every answer is a number of seconds or `null`. `null` means "not knowable
 * here" — an environment variable, a parameter, a call — and the caller
 * abstains: a limit is only enforced on a lifetime the file states.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  memberPath,
  staticString,
} from '@interlace/eslint-devkit';
import {
  resolveTerminal,
  staticNumber,
  type SourceCodeLike,
} from './value-flow';

/** Seconds per unit, keyed by every unit spelling `ms` accepts. */
const UNIT_SECONDS: ReadonlyMap<string, number> = new Map([
  ...['years', 'year', 'yrs', 'yr', 'y'].map((u) => [u, 31_557_600] as const),
  ...['weeks', 'week', 'w'].map((u) => [u, 604_800] as const),
  ...['days', 'day', 'd'].map((u) => [u, 86_400] as const),
  ...['hours', 'hour', 'hrs', 'hr', 'h'].map((u) => [u, 3_600] as const),
  ...['minutes', 'minute', 'mins', 'min', 'm'].map((u) => [u, 60] as const),
  ...['seconds', 'second', 'secs', 'sec', 's'].map((u) => [u, 1] as const),
  ...['milliseconds', 'millisecond', 'msecs', 'msec', 'ms'].map(
    (u) => [u, 0.001] as const,
  ),
]);

/**
 * The grammar of the `ms` package, which jsonwebtoken hands a string
 * `expiresIn` to: a number, optional spaces, an optional unit. A year is
 * 365.25 days there, and a bare number is MILLISECONDS — `expiresIn: '120'` is
 * 0.12 s, not two minutes.
 */
const MS_STRING = /^(-?(?:\d+)?\.?\d+) *([a-z]*)$/i;

/** Seconds an `ms`-format string denotes, or `null` if `ms` would reject it. */
export function msStringSeconds(text: string): number | null {
  const match = MS_STRING.exec(text);
  if (match === null) return null;
  const unit = match[2]!.toLowerCase();
  const perUnit = unit === '' ? 0.001 : UNIT_SECONDS.get(unit);
  return perUnit === undefined ? null : Number(match[1]) * perUnit;
}

/**
 * jsonwebtoken's `expiresIn`: a number is seconds, a string goes through `ms`.
 */
export function expiresInSeconds(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
): number | null {
  const text = staticString(resolveTerminal(node, sourceCode));
  return text === null ? staticNumber(node, sourceCode) : msStringSeconds(text);
}

/** `Math.floor(x)` / `Math.round(x)` / `Math.trunc(x)` / `Math.ceil(x)`. */
const ROUNDING: ReadonlySet<string> = new Set([
  'Math.floor',
  'Math.round',
  'Math.trunc',
  'Math.ceil',
]);

/** The dotted name a call's callee spells — `Date.now` — or `null`. */
function calleeName(node: TSESTree.CallExpression): string | null {
  return memberPath(node.callee)?.join('.') ?? null;
}

/** `Date.now() / 1000`, optionally rounded — the current time in seconds. */
function isNowInSeconds(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
): boolean {
  const value = resolveTerminal(node, sourceCode);
  if (
    value.type === AST_NODE_TYPES.CallExpression &&
    ROUNDING.has(calleeName(value) as string) &&
    value.arguments.length === 1
  ) {
    return isNowInSeconds(value.arguments[0]!, sourceCode);
  }
  return (
    value.type === AST_NODE_TYPES.BinaryExpression &&
    value.operator === '/' &&
    staticNumber(value.right, sourceCode) === 1000 &&
    value.left.type === AST_NODE_TYPES.CallExpression &&
    calleeName(value.left) === 'Date.now'
  );
}

/**
 * A payload `exp` written as now-plus-a-constant —
 * `Math.floor(Date.now() / 1000) + 3600` — read as its lifetime, 3600. An
 * absolute timestamp (`exp: 1234567890`) is a date, not a lifetime, and is not
 * judged.
 */
export function expClaimSeconds(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
): number | null {
  const value = resolveTerminal(node, sourceCode);
  if (
    value.type !== AST_NODE_TYPES.BinaryExpression ||
    value.operator !== '+'
  ) {
    return null;
  }
  if (isNowInSeconds(value.left, sourceCode)) {
    return staticNumber(value.right, sourceCode);
  }
  return isNowInSeconds(value.right, sourceCode)
    ? staticNumber(value.left, sourceCode)
    : null;
}
