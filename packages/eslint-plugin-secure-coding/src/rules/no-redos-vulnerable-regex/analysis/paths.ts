/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * Derived from `regexp-ast-analysis` v0.7.1 (followPaths, getMatchingDirection,
 * getClosestAncestor, isEmptyBackreference, isStrictBackreference,
 * getEffectiveMaximumRepetition), Copyright (c) 2021 Michael Schmidt, MIT
 * License. See THIRD_PARTY_NOTICES.md at the package root. Upstream commit: not
 * recorded in the published tarball (no `gitHead`); the npm release is the pin.
 *
 * What changed: only the entry points the backtracking analysis calls are kept,
 * each narrowed to the node kinds this analysis can reach (a quantifier or an
 * element as the start of a walk, never a character-class member), and the
 * `endPath` hook, which nothing here sets, is gone.
 */
import type {
  Alternative,
  Assertion,
  Backreference,
  CapturingGroup,
  Node,
  Quantifier,
} from './ast';
import { UnsupportedPatternError } from './unsupported';

export type Direction = 'ltr' | 'rtl';

/** The nearest enclosing lookaround decides which way a node is matched. */
export function matchingDirection(node: Node): Direction {
  for (let n = node.parent as Node | null; n; n = n.parent as Node | null) {
    if (n.type === 'Assertion') return n.kind === 'lookbehind' ? 'rtl' : 'ltr';
  }
  return 'ltr';
}

/** The direction a boundary or lookaround assertion looks in. */
export const assertionDirection = (kind: Assertion['kind']): Direction =>
  kind === 'end' || kind === 'lookahead' ? 'ltr' : 'rtl';

export const oppositeDirection = (d: Direction): Direction =>
  d === 'ltr' ? 'rtl' : 'ltr';

/** `true` when `node` has `ancestor` somewhere above it. */
export function hasAncestor(node: Node, ancestor: Node): boolean {
  for (let n = node.parent as Node | null; n; n = n.parent as Node | null) {
    if (n === ancestor) return true;
  }
  return false;
}

/** `true` when `node` or something below it satisfies `test`. Lookarounds are entered. */
export function hasDescendant(node: Node, test: (n: Node) => boolean): boolean {
  if (test(node)) return true;
  switch (node.type) {
    case 'Alternative':
      return node.elements.some((e) => hasDescendant(e, test));
    case 'Assertion':
      return (
        (node.kind === 'lookahead' || node.kind === 'lookbehind') &&
        node.alternatives.some((a) => hasDescendant(a, test))
      );
    case 'CapturingGroup':
    case 'Group':
    case 'Pattern':
      return node.alternatives.some((a) => hasDescendant(a, test));
    case 'Quantifier':
      return hasDescendant(node.element, test);
    default:
      return false;
  }
}

/** Lowest node that contains both arguments (either may be that node). */
export function closestAncestor(a: Node, b: Node): Node {
  if (a === b) return a;
  const ra = chain(a);
  const rb = chain(b);
  for (;;) {
    if (ra.length === 0) return a;
    if (rb.length === 0) return b;
    if (ra[ra.length - 1] !== rb[rb.length - 1]) break;
    ra.pop();
    rb.pop();
  }
  return ra[ra.length - 1].parent as Node;
}

function chain(node: Node): Node[] {
  const out: Node[] = [];
  for (let n: Node | null = node; n; n = n.parent as Node | null) out.push(n);
  return out;
}

/** Product of the `max` of every quantifier above `node`, stopping at a lookaround. */
export function effectiveMaximumRepetition(node: Node): number {
  let product = 1;
  for (let n = node.parent as Node | null; n; n = n.parent as Node | null) {
    if (n.type === 'Quantifier') {
      product *= n.max;
      if (product === 0) return 0;
    } else if (n.type === 'Assertion') {
      break;
    }
  }
  return product;
}

/** The innermost quantifier that contains `node`. */
export function parentQuantifier(node: Node): Quantifier {
  for (let n = node.parent as Node | null; n; n = n.parent as Node | null) {
    if (n.type === 'Quantifier') return n;
  }
  throw new Error('no enclosing quantifier');
}

// ---------------------------------------------------------------------------
// Zero-length and backreferences
// ---------------------------------------------------------------------------

/** The group a backreference points at; several groups sharing a name are not modelled. */
export function resolvedGroup(ref: Backreference): CapturingGroup {
  if (Array.isArray(ref.resolved))
    throw new UnsupportedPatternError('backreference to duplicate group names');
  return ref.resolved as CapturingGroup;
}

/** Always matches the empty string. Character nodes never do (no `\q{}` support). */
function isZeroLength(node: Node): boolean {
  switch (node.type) {
    case 'Alternative':
      return node.elements.every(isZeroLength);
    case 'Assertion':
      return true;
    case 'Quantifier':
      return node.max === 0 || isZeroLength(node.element);
    case 'Backreference':
      return isEmptyBackreference(node);
    case 'CapturingGroup':
    case 'Group':
      return (
        node.alternatives.length > 0 && node.alternatives.every(isZeroLength)
      );
    default:
      return false;
  }
}

/** What can hold an alternative: a pattern, a group, or a lookaround. */
interface Container {
  type: 'Pattern' | 'Group' | 'CapturingGroup' | 'Assertion';
  negate?: boolean;
  alternatives: Alternative[];
  parent: Alternative | Quantifier | null;
}

/** Elements that are matched AFTER `node` inside its alternative, in matching order. */
function after(alt: Alternative, node: Node): Node[] {
  const i = alt.elements.indexOf(node as never);
  return matchingDirection(node) === 'ltr'
    ? alt.elements.slice(i + 1)
    : alt.elements.slice(0, i);
}

/**
 * `true` when the backreference can only ever match the empty string: the group
 * it points at has not been entered yet, is in another branch, or is empty.
 */
export function isEmptyBackreference(ref: Backreference): boolean {
  const group = resolvedGroup(ref);
  const common = closestAncestor(ref, group);
  if (common === group || common.type !== 'Alternative') return true;
  const refChain = new Set(chain(ref));
  const settled = (t: Node): boolean => {
    const parent = t.parent as Node;
    if (parent.type === 'Alternative') {
      if (after(parent, t).some((e) => refChain.has(e))) return true;
      const outer = parent.parent as Container;
      return (
        outer.type !== 'Pattern' &&
        (outer.type !== 'Assertion' || !outer.negate) &&
        settled(outer as unknown as Node)
      );
    }
    return settled(parent);
  };
  return !settled(group) || isZeroLength(group);
}

/** `true` when the group a backreference points at has certainly captured by then. */
export function isStrictBackreference(ref: Backreference): boolean {
  const group = resolvedGroup(ref);
  const common = closestAncestor(ref, group);
  if (common === group || common.type !== 'Alternative') return false;
  const refChain = new Set(chain(ref));
  const strict = (t: Node): boolean => {
    const parent = t.parent as Node;
    if (parent.type === 'Alternative') {
      if (after(parent, t).some((e) => refChain.has(e))) return true;
      const outer = parent.parent as Container;
      return (
        outer.type !== 'Pattern' &&
        (outer.type !== 'Assertion' || !outer.negate) &&
        !(outer.alternatives.length > 1) &&
        strict(outer as unknown as Node)
      );
    }
    return (parent as Quantifier).min !== 0 && strict(parent);
  };
  return strict(group);
}

// ---------------------------------------------------------------------------
// followPaths
// ---------------------------------------------------------------------------

/** What a path walk threads through the pattern, and how it forks and joins. */
export interface PathOps<S> {
  fork?(state: S, dir: Direction): S;
  join(states: S[], dir: Direction): S;
  enter?(node: Node, state: S, dir: Direction): S;
  leave?(node: Node, state: S, dir: Direction): S;
  assert?(state: S, dir: Direction, assertion: S, assertionDir: Direction): S;
  continueInto?(node: Node, state: S, dir: Direction): boolean;
  continueAfter?(node: Node, state: S, dir: Direction): boolean;
  continueOutside?(assertion: Assertion, state: S, dir: Direction): boolean;
}

type Next = false | Node | 'pattern' | 'assertion' | [Quantifier, Next];

/**
 * Walk every path that can follow (`'next'`) or begin at (`'enter'`) `start`,
 * threading a caller-defined state through each element it consumes.
 * The same algorithm as `regexp-ast-analysis`'s `followPaths`, for a start
 * node that is an element or a quantifier.
 */
export function followPaths<S>(
  start: Node,
  mode: 'enter' | 'next',
  initial: S,
  ops: PathOps<S>,
  direction: Direction = matchingDirection(start),
): S {
  const fork = (s: S, d: Direction): S => (ops.fork ? ops.fork(s, d) : s);

  function walk(node: Node, state: S, dir: Direction): S {
    if (ops.enter) state = ops.enter(node, state, dir);
    if (!ops.continueInto || ops.continueInto(node, state, dir)) {
      switch (node.type) {
        case 'Assertion':
          if (node.kind === 'lookahead' || node.kind === 'lookbehind') {
            const look = assertionDirection(node.kind);
            const inner = ops.join(
              node.alternatives.map((a) =>
                walkAlternative(a, fork(state, dir), look),
              ),
              look,
            );
            if (ops.assert) state = ops.assert(state, dir, inner, look);
          }
          break;
        case 'Group':
        case 'CapturingGroup':
          state = ops.join(
            node.alternatives.map((a) =>
              walkAlternative(a, fork(state, dir), dir),
            ),
            dir,
          );
          break;
        case 'Quantifier':
          if (node.max !== 0) {
            state =
              node.min === 0
                ? ops.join(
                    [state, walk(node.element, fork(state, dir), dir)],
                    dir,
                  )
                : walk(node.element, state, dir);
          }
          break;
      }
    }
    return ops.leave ? ops.leave(node, state, dir) : state;
  }

  function walkAlternative(alt: Alternative, state: S, dir: Direction): S {
    const step = dir === 'ltr' ? 1 : -1;
    let i = dir === 'ltr' ? 0 : alt.elements.length - 1;
    for (let el = alt.elements[i]; el; el = alt.elements[(i += step)]) {
      state = walk(el, state, dir);
      if (ops.continueAfter && !ops.continueAfter(el, state, dir)) break;
    }
    return state;
  }

  function next(node: Node, state: S, dir: Direction): Next {
    const parent = node.parent as Node;
    if (ops.continueAfter && !ops.continueAfter(node, state, dir)) return false;
    if (parent.type === 'Quantifier') {
      return parent.max <= 1
        ? next(parent, state, dir)
        : [parent, next(parent, state, dir)];
    }
    const alt = parent as Alternative;
    const sibling =
      alt.elements[
        alt.elements.indexOf(node as never) + (dir === 'ltr' ? 1 : -1)
      ];
    if (sibling) return sibling;
    const outer = alt.parent as Node;
    if (outer.type === 'Pattern') return 'pattern';
    if (outer.type === 'Assertion') {
      return ops.continueOutside && ops.continueOutside(outer, state, dir)
        ? next(outer, state, dir)
        : 'assertion';
    }
    return next(outer, state, dir);
  }

  let state = initial;
  let node = start;
  if (mode === 'enter') state = walk(node, state, direction);
  for (;;) {
    let n = next(node, state, direction);
    while (Array.isArray(n)) {
      const [quantifier, rest] = n;
      state = ops.join(
        [state, walk(quantifier, fork(state, direction), direction)],
        direction,
      );
      n = rest;
    }
    if (n === false || n === 'assertion' || n === 'pattern') return state;
    state = walk(n, state, direction);
    node = n;
  }
}
