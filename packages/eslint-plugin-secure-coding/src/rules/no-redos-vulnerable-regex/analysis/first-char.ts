/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * Derived from `regexp-ast-analysis` v0.7.1 (getFirstCharAfter and the
 * FirstConsumedChars / FirstLookChars machinery behind it), Copyright (c) 2021
 * Michael Schmidt, MIT License. See THIRD_PARTY_NOTICES.md at the package root.
 * Upstream commit: not recorded in the published tarball (no `gitHead`); the
 * npm release is the pin.
 *
 * What changed: the analysis asks exactly one question of this code — "what
 * character can come right after this word boundary?" — so only
 * `getFirstCharAfter` is kept. The per-node caches (a fresh one was built per
 * call and so never shared), `getFirstConsumedChar` and the `v`-flag string
 * word sets are dropped.
 */
import type { Alternative, Assertion, Backreference, Node } from './ast';
import { CharSet } from './char-set';
import type { Flags } from './char-classes';
import {
  allChars,
  emptyChars,
  lineTerminatorChars,
  toCharSet,
  wordChars,
} from './char-classes';
import type { Direction } from './paths';
import {
  assertionDirection,
  followPaths,
  hasDescendant,
  isEmptyBackreference,
  isStrictBackreference,
  oppositeDirection,
  resolvedGroup,
} from './paths';

interface Look {
  char: CharSet;
  exact: boolean;
  /** The position may be the start or end of input. */
  edge: boolean;
}

/** The first character consumed, or — when the element can match empty — what follows. */
interface First {
  char: CharSet;
  exact: boolean;
  empty: boolean;
  look?: Look;
}

const lookAll = (f: Flags): Look => ({
  char: allChars(f),
  exact: true,
  edge: true,
});

const emptyConcat = (f: Flags): First => ({
  char: emptyChars(f),
  exact: true,
  empty: true,
  look: lookAll(f),
});

function toConsumed(look: Look): First {
  return !look.edge && look.char.isEmpty
    ? { char: look.char, exact: true, empty: false }
    : {
        char: CharSet.empty(look.char.maximum),
        exact: true,
        empty: true,
        look,
      };
}

function makeOptional(f: First): First {
  return {
    char: f.char,
    exact: f.exact,
    empty: true,
    look: { char: CharSet.all(f.char.maximum), exact: true, edge: true },
  };
}

/** Accumulates chars that are certainly (`exact`) or only possibly the answer. */
class Acc {
  private sure: CharSet;
  private maybe: CharSet;
  constructor(empty: CharSet) {
    this.sure = empty;
    this.maybe = empty;
  }
  add(x: { char: CharSet; exact: boolean }): void {
    if (x.exact) this.sure = this.sure.union(x.char);
    else this.maybe = this.maybe.union(x.char);
  }
  get char(): CharSet {
    return this.sure.union(this.maybe);
  }
  get exact(): boolean {
    return this.sure.isSupersetOf(this.maybe);
  }
}

function intersectLook(
  a: { char: CharSet; exact: boolean },
  b: { char: CharSet; exact: boolean },
) {
  const char = a.char.intersect(b.char);
  return { char, exact: (a.exact && b.exact) || char.isEmpty };
}

function union(items: First[], f: Flags): First {
  const acc = new Acc(emptyChars(f));
  const looks: Look[] = [];
  for (const it of items) {
    acc.add(it);
    if (it.empty) looks.push(it.look!);
  }
  if (looks.length === 0)
    return { char: acc.char, exact: acc.exact, empty: false };
  if (looks.length === 1)
    return { char: acc.char, exact: acc.exact, empty: true, look: looks[0] };
  const lacc = new Acc(emptyChars(f));
  let edge = false;
  for (const l of looks) {
    lacc.add(l);
    edge = edge || l.edge;
  }
  return {
    char: acc.char,
    exact: acc.exact,
    empty: true,
    look: { char: lacc.char, exact: lacc.exact, edge },
  };
}

function concat(items: Iterable<First>, f: Flags): First {
  const acc = new Acc(emptyChars(f));
  let look = lookAll(f);
  for (const it of items) {
    acc.add(intersectLook(it, look));
    if (!it.empty) return { char: acc.char, exact: acc.exact, empty: false };
    const both = intersectLook(look, it.look!);
    look = {
      char: both.char,
      exact: both.exact,
      edge: look.edge && it.look!.edge,
    };
    if (!look.edge && look.char.isEmpty)
      return { char: acc.char, exact: acc.exact, empty: false };
  }
  return { char: acc.char, exact: acc.exact, empty: true, look };
}

function toLook(first: First): Look {
  if (!first.empty)
    return { char: first.char, exact: first.exact, edge: false };
  const look = first.look!;
  const char = first.char.union(look.char);
  const exact = first.exact
    ? look.exact || first.char.isSupersetOf(look.char)
    : look.exact && look.char.isSupersetOf(first.char);
  return { char, exact, edge: look.edge };
}

/**
 * The most characters an element or alternative list can consume. The only
 * question asked of it is "is that exactly one?", so the minimum is not kept.
 */
function maxLength(node: Node | readonly Alternative[]): number {
  if (Array.isArray(node))
    return Math.max(...(node as readonly Alternative[]).map(maxLength));
  const n = node as Node;
  switch (n.type) {
    case 'Assertion':
      return 0;
    case 'Quantifier': {
      const inner = n.max === 0 ? 0 : maxLength(n.element);
      return inner === 0 ? 0 : inner * n.max;
    }
    case 'Alternative':
      return n.elements.reduce((sum, e) => sum + maxLength(e), 0);
    case 'CapturingGroup':
    case 'Group':
      return maxLength(n.alternatives);
    case 'Backreference':
      return isEmptyBackreference(n) ? 0 : maxLength(resolvedGroup(n));
    default:
      return 1;
  }
}

/**
 * Memo for one `firstCharAfter` call. It is not only an optimisation: a node
 * first reached while a word boundary is being resolved gets the pessimistic
 * answer for that boundary, and that answer is what later lookups in the same
 * call see, exactly as in the library this is ported from. Dropping the memo
 * changes verdicts on patterns that stack `\b` and `\B`.
 */
interface Ctx {
  boundaries: Node[];
  ltr: Map<Node, First>;
  rtl: Map<Node, First>;
}

const newCtx = (): Ctx => ({ boundaries: [], ltr: new Map(), rtl: new Map() });

function firstOf(node: Node, dir: Direction, f: Flags, ctx: Ctx): First {
  const memo = dir === 'ltr' ? ctx.ltr : ctx.rtl;
  let first = memo.get(node);
  if (first === undefined) {
    first = compute(node, dir, f, ctx);
    memo.set(node, first);
  }
  return first;
}

function compute(node: Node, dir: Direction, f: Flags, ctx: Ctx): First {
  switch (node.type) {
    case 'Assertion':
      return firstOfAssertion(node, dir, f, ctx);
    case 'Character':
    case 'CharacterSet':
    case 'CharacterClass':
    case 'ExpressionCharacterClass':
      return { char: toCharSet(node, f), exact: true, empty: false };
    case 'Quantifier': {
      if (node.max === 0) return emptyConcat(f);
      const inner = firstOf(node.element, dir, f, ctx);
      return node.min === 0 ? makeOptional(inner) : inner;
    }
    case 'Alternative': {
      const els = dir === 'rtl' ? [...node.elements].reverse() : node.elements;
      return concat(
        els.map((e) => firstOf(e, dir, f, ctx)),
        f,
      );
    }
    case 'CapturingGroup':
    case 'Group':
      return union(
        node.alternatives.map((a) => firstOf(a, dir, f, ctx)),
        f,
      );
    default: {
      // Backreference: the only other element a quantified or sequenced walk meets.
      const ref = node as Backreference;
      if (isEmptyBackreference(ref)) return emptyConcat(f);
      let inner = firstOf(resolvedGroup(ref), dir, f, ctx);
      if (inner.exact && inner.char.size > 1)
        inner = { ...inner, exact: false };
      return isStrictBackreference(ref) ? inner : makeOptional(inner);
    }
  }
}

function firstOfAssertion(
  node: Assertion,
  dir: Direction,
  f: Flags,
  ctx: Ctx,
): First {
  const unknown = (): First =>
    toConsumed({ char: allChars(f), edge: true, exact: false });
  const wordSide = (edge: boolean): First => {
    const word = wordChars(f);
    return toConsumed({ char: edge ? word.negate() : word, edge, exact: true });
  };
  switch (node.kind) {
    case 'word': {
      if (ctx.boundaries.includes(node)) return unknown();
      ctx.boundaries.push(node);
      const around = toLook(followAfter(node, oppositeDirection(dir), f, ctx));
      ctx.boundaries.pop();
      const word = wordChars(f);
      if (around.char.isDisjointWith(word)) return wordSide(node.negate);
      if (!around.edge && around.char.isSubsetOf(word))
        return wordSide(!node.negate);
      return unknown();
    }
    case 'end':
    case 'start':
      if (assertionDirection(node.kind) !== dir) return unknown();
      return f.multiline
        ? toConsumed({ char: lineTerminatorChars(f), edge: true, exact: true })
        : toConsumed({ char: emptyChars(f), edge: true, exact: true });
    default: {
      // lookahead / lookbehind
      if (assertionDirection(node.kind) !== dir) return unknown();
      if (
        node.negate &&
        hasDescendant(node, (n) => n !== node && n.type === 'Assertion')
      )
        return unknown();
      const first = union(
        node.alternatives.map((a) => firstOf(a, dir, f, ctx)),
        f,
      );
      if (!node.negate) return toConsumed(toLook(first));
      if (first.empty)
        return { char: emptyChars(f), exact: true, empty: false };
      return first.exact && maxLength(node.alternatives) === 1
        ? toConsumed({ char: first.char.negate(), edge: true, exact: true })
        : unknown();
    }
  }
}

function followAfter(node: Node, dir: Direction, f: Flags, ctx: Ctx): First {
  return followPaths<First>(
    node,
    'next',
    emptyConcat(f),
    {
      join: (states) => union(states, f),
      enter: (n, state, d) => concat([state, firstOf(n, d, f, ctx)], f),
      continueInto: () => false,
      continueAfter: (_n, state) => state.empty,
      continueOutside: (assertion, _s, d) =>
        assertionDirection(assertion.kind) !== d,
    },
    dir,
  );
}

/**
 * The characters that can sit immediately after `node`, looking in `dir`, as the
 * set plus whether the start or end of input is also possible there.
 */
export function firstCharAfter(node: Node, dir: Direction, f: Flags): Look {
  return toLook(followAfter(node, dir, f, newCtx()));
}
