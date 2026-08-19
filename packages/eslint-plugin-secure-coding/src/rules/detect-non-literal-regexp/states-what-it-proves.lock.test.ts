/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The message may not claim a weakness the rule did not establish.
 *
 * This rule proves one thing: the pattern handed to `RegExp` is not a literal,
 * so its content is decided at runtime. It reported something else. Measured
 * 2026-08-19 over 20 repositories, all 112 distinct cases and every one of the
 * 245 findings carried `issueName: 'ReDoS vulnerability'` and
 * `description: 'ReDoS vulnerability detected'`.
 *
 * Catastrophic backtracking is a property of a PATTERN, and deciding it needs
 * an automaton, not a syntax check. `no-redos-vulnerable-regex` decides it with
 * `recheck` at 98.1% precision. `new RegExp(escapeRegExp(name))` is not a
 * literal and cannot backtrack; `/(x+x+)+y/` is a literal and does. The two
 * claims are independent, and asserting the second from the first told every
 * reader the wrong thing.
 *
 * Upstream `eslint-plugin-security` at least hedges — "might allow an attacker
 * to DOS your server". Ours dropped the hedge and asserted the vulnerability
 * outright, which is the one claim it has no evidence for.
 *
 * This is a LOCK. If a future change wants to assert a weakness here, it needs
 * the evidence for that weakness at the report site — not a word list, not a
 * shape that resembles one.
 */
import { describe, expect, it } from 'vitest';
import { detectNonLiteralRegexp } from './index';

const messages = detectNonLiteralRegexp.meta.messages as Record<string, string>;

describe('detect-non-literal-regexp — the message states what the rule proves', () => {
  it('reports a runtime-decided pattern, not a vulnerability', () => {
    expect(Object.keys(messages)).toEqual(['runtimeDecidedPattern']);
  });

  it('does not assert ReDoS, which it cannot decide', () => {
    const text = messages.runtimeDecidedPattern;
    expect(text).not.toMatch(/ReDoS vulnerability/i);
    expect(text).not.toMatch(/vulnerability detected/i);
  });

  it('names what it did establish', () => {
    expect(messages.runtimeDecidedPattern).toMatch(/runtime/i);
  });

  it('points at the rule that decides backtracking, so the reader can get an answer', () => {
    // A finding that says "I cannot tell" is only useful if it says who can.
    expect(messages.runtimeDecidedPattern).toMatch(/no-redos-vulnerable-regex/);
  });

  it('keeps the CWE that motivates the check without claiming it is proven', () => {
    // CWE-400 is why a runtime-decided pattern is worth surfacing at all. The
    // finding is a pointer to that risk, not a demonstration of it, and the
    // description above is what carries the difference.
    expect(messages.runtimeDecidedPattern).toMatch(/CWE-400/);
  });
});
