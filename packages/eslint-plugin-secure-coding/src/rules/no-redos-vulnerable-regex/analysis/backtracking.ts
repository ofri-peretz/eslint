/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * Derived from `scslre` v0.3.0 (analyse), Copyright (c) 2020 Michael Schmidt,
 * MIT License. See THIRD_PARTY_NOTICES.md at the package root. Upstream commit:
 * not recorded in the published tarball (no `gitHead`); the npm release is the
 * pin.
 *
 * What changed: `scslre` also computes an auto-fix for every report (a regex
 * rewriter built on refa's DFA minimiser) and a third report type, `Move`. The
 * rule asked for neither, so this keeps the detection and nothing else: for each
 * unbounded quantifier, follow every path that can come after it (and every path
 * into it from a parent loop) and report where a second quantifier can consume a
 * character the first one could also have consumed. `Self` is a quantifier
 * nested in a loop that can re-enter itself; `Trade` is two quantifiers that can
 * hand characters to each other. Degree is "exponential" when the loop sits
 * under more than 20 effective repetitions.
 */
import type { Node, Pattern, Quantifier } from './ast';
import { CharSet } from './char-set';
import type { Direction } from './paths';
import type { Flags } from './char-classes';
import {
  allChars,
  emptyChars,
  isCharacterLike,
  lineTerminatorChars,
  toCharSet,
  wordChars,
} from './char-classes';
import { firstCharAfter } from './first-char';
import {
  closestAncestor,
  effectiveMaximumRepetition,
  followPaths,
  hasAncestor,
  isEmptyBackreference,
  isStrictBackreference,
  parentQuantifier,
  resolvedGroup,
} from './paths';
import { walkQuantifiers } from './walk';

export type { Flags } from './char-classes';

/** One ambiguity: `Self` (a loop that re-enters itself) or `Trade` (two loops sharing characters). */
export interface BacktrackingReport {
  type: 'Self' | 'Trade';
  exponential: boolean;
}

/** What an element consumes, and what a lookaround next to it requires of the character there. */
interface Step {
  consume: CharSet;
  assert: CharSet;
}

/** An element sequence: consume what each consumes, constrained by every assertion on the way. */
function sequence(parts: Iterable<Step>, f: Flags): Step {
  let consume = emptyChars(f);
  let assert = allChars(f);
  for (const part of parts) {
    consume = consume
      .intersect(part.consume.union(part.assert))
      .union(part.consume.intersect(assert));
    assert = assert.intersect(part.assert);
    if (assert.isEmpty && consume.isEmpty) break;
  }
  return { consume, assert };
}

/** Alternatives: either may happen, so either's characters and requirements do. */
function alternation(parts: readonly Step[], f: Flags): Step {
  if (parts.length === 1) return parts[0];
  let consume = emptyChars(f);
  let assert = consume;
  for (const part of parts) {
    consume = consume.union(part.consume);
    assert = assert.union(part.assert);
  }
  return { consume, assert };
}

/** A lookaround consumes nothing and asserts what its body would consume or assert. */
const lookaround = (step: Step): Step => ({
  consume: CharSet.empty(step.consume.maximum),
  assert: step.consume.union(step.assert),
});

/** Consume / assert for one node, per the rules above. */
function stepOf(node: Node | readonly Node[], f: Flags): Step {
  if (Array.isArray(node))
    return alternation(
      (node as readonly Node[]).map((n) => stepOf(n, f)),
      f,
    );
  const n = node as Node;
  switch (n.type) {
    case 'Alternative':
      return sequence(
        n.elements.map((e) => stepOf(e, f)),
        f,
      );
    case 'Assertion':
      switch (n.kind) {
        case 'start':
        case 'end':
          return {
            consume: emptyChars(f),
            assert: f.multiline ? lineTerminatorChars(f) : emptyChars(f),
          };
        case 'word': {
          const word = wordChars(f);
          const other = word.negate();
          for (const dir of ['ltr', 'rtl'] as const) {
            const around = firstCharAfter(n, dir, f);
            if (around.edge) continue;
            if (around.char.isSubsetOf(word))
              return {
                consume: emptyChars(f),
                assert: n.negate ? word : other,
              };
            if (around.char.isSubsetOf(other))
              return {
                consume: emptyChars(f),
                assert: n.negate ? other : word,
              };
          }
          return {
            consume: emptyChars(f),
            assert: n.negate ? allChars(f) : emptyChars(f),
          };
        }
        default: {
          const inner = lookaround(stepOf(n.alternatives, f));
          return n.negate
            ? { consume: emptyChars(f), assert: inner.assert.negate() }
            : inner;
        }
      }
    case 'CapturingGroup':
    case 'Group':
      return stepOf(n.alternatives, f);
    case 'Quantifier': {
      if (n.max === 0) return { consume: emptyChars(f), assert: allChars(f) };
      const inner = stepOf(n.element, f);
      return n.min === 0
        ? { consume: inner.consume, assert: allChars(f) }
        : inner;
    }
    case 'Backreference': {
      if (isEmptyBackreference(n))
        return { consume: emptyChars(f), assert: allChars(f) };
      const target = stepOf(resolvedGroup(n), f);
      return isStrictBackreference(n)
        ? target
        : { consume: target.consume, assert: allChars(f) };
    }
    default:
      return { consume: toCharSet(n, f), assert: emptyChars(f) };
  }
}

/** 0 = still looking, 1 = reached the start quantifier again, 2 = a character blocked the way. */
type Reach = 0 | 1 | 2;

/**
 * Walk `from`'s enclosing loop in `dir` and report whether `inner` is reachable
 * from `outer` again without anything consuming a character `chars` cannot.
 */
function reentersItself(
  outer: Node,
  inner: Node,
  chars: CharSet,
  dir: Direction,
  step: (n: Node) => Step,
): boolean {
  return (
    followPaths<Reach>(
      outer,
      'enter',
      0,
      {
        join: (states) =>
          states.every((s) => s === 2)
            ? 2
            : states.some((s) => s === 1)
              ? 1
              : 0,
        continueAfter: (node, state) => node !== outer && state === 0,
        continueInto: (_node, state) => state === 0,
        enter: (node, state) => (node === inner ? 1 : state),
        leave(node, state) {
          if (state !== 0) return state;
          if (
            node.type === 'Assertion' ||
            node.type === 'Backreference' ||
            isCharacterLike(node)
          ) {
            const s = step(node);
            return chars.isSubsetOf(s.consume.union(s.assert)) ? 0 : 2;
          }
          return state;
        },
      },
      dir,
    ) === 1
  );
}

/**
 * Find every pair of unbounded quantifiers that can share a character, in the
 * order `scslre` would report them. Throws for a pattern containing a `v`-flag
 * string set, which has no single-character model; the caller declines.
 */
export function analyse(input: { pattern: Pattern; flags: Flags }): {
  reports: BacktrackingReport[];
} {
  const { pattern, flags: f } = input;
  const reports: BacktrackingReport[] = [];
  const memo = new Map<Node, Step>();
  const step = (n: Node): Step => {
    let s = memo.get(n);
    if (s === undefined) {
      s = stepOf(n, f);
      memo.set(n, s);
    }
    return s;
  };

  const ops = {
    join: (states: Step[]) => alternation(states, f),
    continueAfter: (_n: Node, s: Step) =>
      !(s.assert.isEmpty && s.consume.isEmpty),
    continueInto: (_n: Node, s: Step) =>
      !(s.assert.isEmpty && s.consume.isEmpty),
    leave(node: Node, s: Step): Step {
      return node.type === 'Assertion' ||
        node.type === 'Backreference' ||
        isCharacterLike(node)
        ? sequence([s, step(node)], f)
        : s;
    },
  };

  /** Characters `quantifier` can take that something after it could not have taken instead. */
  const reachable = (state: Step, quantifier: Node): CharSet => {
    const cut = step(quantifier).consume.intersect(
      state.consume.union(state.assert),
    );
    if (cut.isEmpty) return cut;
    const tail = lookaround(
      followPaths<Step>(
        quantifier,
        'next',
        { consume: emptyChars(f), assert: allChars(f) },
        ops,
      ),
    );
    return cut.without(tail.assert);
  };

  const seen = {
    self: new Map<Node, Set<Node>>(),
    trade: new Map<Node, Set<Node>>(),
  };
  const alreadySeen = (
    map: Map<Node, Set<Node>>,
    a: Node,
    b: Node,
  ): boolean => {
    let set = map.get(a);
    if (set === undefined) {
      set = new Set();
      map.set(a, set);
    }
    if (set.has(b)) return true;
    set.add(b);
    return false;
  };
  const degree = (n: Node): boolean =>
    effectiveMaximumRepetition(n) * ((n as Quantifier).max ?? 1) > 20;

  const meet = (start: Quantifier, other: Quantifier, state: Step): void => {
    if (other.max !== Infinity) return;
    const chars = reachable(state, other);
    if (chars.isEmpty) return;
    let inner: Quantifier | undefined;
    let outer: Quantifier | undefined;
    if (start === other) {
      inner = start;
      outer = parentQuantifier(start);
    } else if (hasAncestor(start, other)) {
      inner = start;
      outer = other;
    } else if (hasAncestor(other, start)) {
      inner = other;
      outer = start;
    }
    let boundary: Node | undefined;
    if (inner && outer) {
      for (
        let n = inner.parent as Node | null;
        n && n !== outer;
        n = n.parent as Node | null
      ) {
        if (n.type === 'Assertion') boundary = n;
      }
    }
    if (inner && outer && boundary) {
      if (!alreadySeen(seen.trade, start, boundary))
        reports.push({ type: 'Trade', exponential: false });
    } else if (
      inner &&
      outer &&
      reentersItself(outer, inner, chars, 'ltr', step) &&
      reentersItself(outer, inner, chars, 'rtl', step)
    ) {
      if (!alreadySeen(seen.self, inner, outer))
        reports.push({ type: 'Self', exponential: degree(outer) });
    } else if (!alreadySeen(seen.trade, start, other)) {
      reports.push({
        type: 'Trade',
        exponential: degree(closestAncestor(start, other)),
      });
    }
  };

  walkQuantifiers(pattern, {
    leave(q) {
      if (q.max !== Infinity) return;
      const state = step(q.element);
      if (state.consume.isEmpty) return;
      followPaths<Step>(q, 'next', state, {
        ...ops,
        enter: (n, s) => (n.type === 'Quantifier' && meet(q, n, s), s),
      });
      followPaths<Step>(q, 'enter', state, {
        ...ops,
        enter: (n, s) => (
          n !== q && n.type === 'Quantifier' && meet(q, n, s),
          s
        ),
        continueAfter: (n, s) => ops.continueAfter(n, s) && n !== q,
      });
    },
  });
  return { reports };
}
