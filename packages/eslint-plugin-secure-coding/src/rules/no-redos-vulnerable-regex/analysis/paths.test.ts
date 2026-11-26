/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RegExpParser } from '../../../regex-parser';
import { describe, expect, it } from 'vitest';
import type { Backreference, Node, Quantifier } from './ast';
import {
  assertionDirection,
  closestAncestor,
  effectiveMaximumRepetition,
  followPaths,
  hasAncestor,
  hasDescendant,
  isEmptyBackreference,
  isStrictBackreference,
  matchingDirection,
  oppositeDirection,
  parentQuantifier,
  resolvedGroup,
} from './paths';
import { walkQuantifiers } from './walk';
import { UnsupportedPatternError } from './unsupported';

const parse = (source: string, flags = '') =>
  new RegExpParser().parsePattern(source, 0, source.length, {
    unicode: flags.includes('u'),
  });

/** First node (depth-first) whose source text is `raw` and whose type is `type`. */
function find(root: Node, raw: string, type?: string): Node {
  let hit: Node | undefined;
  const visit = (n: Node): void => {
    if (hit) return;
    if (
      n.raw === raw &&
      (type === undefined ? n.type !== 'Alternative' : n.type === type)
    ) {
      hit = n;
      return;
    }
    for (const k of ['alternatives', 'elements'] as const) {
      const kids = (n as unknown as Record<string, Node[] | undefined>)[k];
      if (Array.isArray(kids)) kids.forEach(visit);
    }
    const el = (n as { element?: Node }).element;
    if (el) visit(el);
  };
  visit(root);
  if (!hit) throw new Error(`no node ${raw}`);
  return hit;
}

describe('directions', () => {
  it('lookbehind flips to rtl, anything else is ltr', () => {
    const ast = parse('a(?<=b)(?=c)(?<!d(e))');
    expect(matchingDirection(find(ast, 'a'))).toBe('ltr');
    expect(matchingDirection(find(ast, 'b'))).toBe('rtl');
    expect(matchingDirection(find(ast, 'c'))).toBe('ltr');
    expect(matchingDirection(find(ast, 'e'))).toBe('rtl');
  });

  it('assertionDirection and oppositeDirection', () => {
    expect(assertionDirection('end')).toBe('ltr');
    expect(assertionDirection('lookahead')).toBe('ltr');
    expect(assertionDirection('start')).toBe('rtl');
    expect(assertionDirection('lookbehind')).toBe('rtl');
    expect(assertionDirection('word')).toBe('rtl');
    expect(oppositeDirection('ltr')).toBe('rtl');
    expect(oppositeDirection('rtl')).toBe('ltr');
  });
});

describe('tree helpers', () => {
  it('hasAncestor', () => {
    const ast = parse('(a(b))c');
    expect(hasAncestor(find(ast, 'b'), find(ast, '(a(b))'))).toBe(true);
    expect(hasAncestor(find(ast, 'c'), find(ast, '(a(b))'))).toBe(false);
  });

  it('hasDescendant looks through groups, quantifiers and lookarounds, but not boundaries', () => {
    const ast = parse('(?:x|(y+))(?=z)\\b');
    const isChar = (c: string) => (n: Node) =>
      n.type === 'Character' && n.raw === c;
    expect(hasDescendant(ast, isChar('x'))).toBe(true);
    expect(hasDescendant(ast, isChar('y'))).toBe(true);
    expect(hasDescendant(ast, isChar('z'))).toBe(true);
    expect(hasDescendant(ast, isChar('q'))).toBe(false);
    expect(hasDescendant(find(ast, '\\b'), isChar('x'))).toBe(false);
    expect(hasDescendant(find(ast, 'x'), () => false)).toBe(false);
    expect(hasDescendant(find(ast, '(?=z)'), isChar('z'))).toBe(true);
  });

  it('closestAncestor', () => {
    const ast = parse('(a|(b)c)d');
    const a = find(ast, 'a');
    const b = find(ast, 'b');
    const c = find(ast, 'c');
    const group = find(ast, '(a|(b)c)');
    expect(closestAncestor(a, a)).toBe(a);
    expect(closestAncestor(b, find(ast, '(b)'))).toBe(find(ast, '(b)'));
    expect(closestAncestor(find(ast, '(b)'), b)).toBe(find(ast, '(b)'));
    expect(closestAncestor(a, c)).toBe(group);
    expect(closestAncestor(b, c)).toBe(find(ast, '(b)c', 'Alternative'));
    expect(closestAncestor(a, find(ast, 'd'))).toBe(ast.alternatives[0]);
  });

  it('effectiveMaximumRepetition multiplies enclosing maxima, stops at lookarounds, and is 0 under {0}', () => {
    const ast = parse('((a{2}){3})*(?:(?=b))*c{0}(d{0}e)');
    expect(effectiveMaximumRepetition(find(ast, 'a'))).toBe(Infinity);
    expect(effectiveMaximumRepetition(find(ast, 'a{2}'))).toBe(Infinity);
    expect(effectiveMaximumRepetition(find(ast, 'b'))).toBe(1);
    expect(effectiveMaximumRepetition(find(ast, 'e'))).toBe(1);
    expect(effectiveMaximumRepetition(find(parse('(?:c{0})*'), 'c'))).toBe(0);
    expect(effectiveMaximumRepetition(find(parse('(a{2}){3}'), 'a'))).toBe(6);
    expect(effectiveMaximumRepetition(find(parse('(a{0}){3}'), 'a{0}'))).toBe(
      3,
    );
    expect(
      effectiveMaximumRepetition(find(parse('(?:(?:a){0}b){3}'), 'a')),
    ).toBe(0);
  });

  it('parentQuantifier finds the nearest loop or throws', () => {
    const ast = parse('(a+)*');
    expect(parentQuantifier(find(ast, 'a+')).raw).toBe('(a+)*');
    expect(() => parentQuantifier(find(parse('a+b'), 'b'))).toThrow(
      'no enclosing quantifier',
    );
  });
});

describe('backreferences', () => {
  const ref = (source: string, flags = ''): Backreference => {
    const ast = parse(source, flags);
    const found: Backreference[] = [];
    const visit = (n: Node): void => {
      if (n.type === 'Backreference') found.push(n);
      for (const k of ['alternatives', 'elements'] as const) {
        const kids = (n as unknown as Record<string, Node[] | undefined>)[k];
        if (Array.isArray(kids)) kids.forEach(visit);
      }
      const el = (n as { element?: Node }).element;
      if (el) visit(el);
    };
    visit(ast);
    return found[found.length - 1];
  };

  // [pattern, empty, strict] — the answers regexp-ast-analysis 0.7.1 gives for the
  // same patterns, recorded from that library when it was replaced.
  const TABLE: Array<[string, boolean, boolean]> = [
    ['(a)\\1', false, true],
    ['\\1(a)', true, false],
    ['(a)|\\1', true, false],
    ['(a\\1)', true, false],
    ['()\\1', true, true],
    ['(a)(?:b|\\1)', false, true],
    ['(?:(a)|b)\\1', false, false],
    ['(?:(a)c)*\\1', false, false],
    ['(?!(a))\\1', true, false],
    ['(?=(a))\\1', false, true],
    ['(?<=\\1(a))', false, true],
    ['(?<=(a)\\1)', true, false],
    ['(a*)\\1', false, true],
    ['(a{0})\\1', true, true],
    ['(\\b)\\1', true, true],
    ['((a)\\2)\\1', false, true],
    ['(?:()|a)\\1', true, false],
    ['(?:()|())\\1', true, false],
    ['(?<n>)\\k<n>', true, true],
    ['(a)?\\1', false, false],
    ['(a)*\\1', false, false],
    ['(a)+\\1', false, true],
    ['(?:(a))\\1', false, true],
    ['(?:(a)|(b)\\2)', false, true],
    ['()(\\1)\\2', true, true],
    ['(a)(\\1)\\2', false, true],
  ];

  it.each(TABLE)('%s: empty=%s strict=%s', (source, empty, strict) => {
    const r = ref(source);
    expect(isEmptyBackreference(r)).toBe(empty);
    expect(isStrictBackreference(r)).toBe(strict);
  });

  it('a backreference that may mean several groups is declined', () => {
    const dup = ref('(?:(?<n>a)|(?<n>b))\\k<n>');
    expect(() => resolvedGroup(dup)).toThrow(UnsupportedPatternError);
    expect(() => isEmptyBackreference(dup)).toThrow(UnsupportedPatternError);
    expect(resolvedGroup(ref('(a)\\1')).raw).toBe('(a)');
  });
});

describe('followPaths', () => {
  /** Record every node visited, in order, following what comes next after `from`. */
  const trail = (
    source: string,
    from: string,
    mode: 'enter' | 'next',
    extra: Record<string, unknown> = {},
  ) => {
    const ast = parse(source);
    const seen: string[] = [];
    followPaths<number>(find(ast, from, 'Character'), mode, 0, {
      join: (states) => Math.max(...states),
      enter: (n, s) => (seen.push(n.raw), s),
      ...extra,
    });
    return seen;
  };

  it("'next' visits what follows, 'enter' starts at the node itself", () => {
    expect(trail('abc', 'a', 'next')).toEqual(['b', 'c']);
    expect(trail('abc', 'a', 'enter')).toEqual(['a', 'b', 'c']);
  });

  it('walks right to left inside a lookbehind', () => {
    expect(trail('(?<=abc)', 'c', 'next')).toEqual(['b', 'a']);
  });

  it('a loop that can repeat is walked again; a ? is not', () => {
    expect(trail('(ab)+c', 'a', 'next')).toEqual([
      'b',
      '(ab)+',
      '(ab)',
      'a',
      'b',
      'c',
    ]);
    expect(trail('(ab)?c', 'a', 'next')).toEqual(['b', 'c']);
  });

  it('descends into groups and optional elements, and skips {0}', () => {
    expect(trail('a(b|c)d?e{0}f', 'a', 'next')).toEqual([
      '(b|c)',
      'b',
      'c',
      'd?',
      'd',
      'e{0}',
      'f',
    ]);
  });

  it('a lookaround is walked in its own direction and reported through assert', () => {
    const asserts: number[] = [];
    const ast = parse('a(?<=xy)b');
    followPaths<number>(find(ast, 'a'), 'next', 0, {
      join: (s) => Math.max(...s),
      enter: (n, s) => (n.type === 'Character' && n.raw === 'y' ? 7 : s),
      assert: (state, _dir, inside) => (asserts.push(inside), state),
    });
    expect(asserts).toEqual([7]);
    expect(trail('a(?<=xy)b', 'a', 'next')).toEqual(['(?<=xy)', 'y', 'x', 'b']);
    expect(trail('a(?=xy)b', 'a', 'next')).toEqual(['(?=xy)', 'x', 'y', 'b']);
    expect(trail('a(?!xy)b', 'a', 'next')).toEqual(['(?!xy)', 'x', 'y', 'b']);
  });

  it('a boundary assertion is visited but has no body to walk', () => {
    expect(trail('a\\bb', 'a', 'next')).toEqual(['\\b', 'b']);
  });

  it('assert is optional; so are fork, leave and the continue hooks', () => {
    expect(trail('a(?=x)b', 'a', 'next')).toEqual(['(?=x)', 'x', 'b']);
  });

  it('fork is applied before descending', () => {
    const forks: string[] = [];
    trail('a(b|c)d?', 'a', 'next', {
      fork: (s: number, d: string) => (forks.push(d), s),
    });
    expect(forks).toEqual(['ltr', 'ltr', 'ltr']);
  });

  it('continueInto false skips the contents; continueAfter false stops the walk', () => {
    expect(
      trail('a(b|c)d', 'a', 'next', { continueInto: () => false }),
    ).toEqual(['(b|c)', 'd']);
    expect(
      trail('abc', 'a', 'next', { continueAfter: (n: Node) => n.raw !== 'b' }),
    ).toEqual(['b']);
    expect(
      trail('(?:ab)+', 'a', 'next', { continueAfter: () => false }),
    ).toEqual([]);
  });

  it('continueAfter inside an alternative stops that alternative only', () => {
    const seen: string[] = [];
    followPaths<number>(find(parse('x(ab|cd)y'), 'x'), 'next', 0, {
      join: (s) => Math.max(...s),
      enter: (n, s) => (seen.push(n.raw), s),
      continueAfter: (n) => n.raw !== 'a' && n.raw !== 'c',
    });
    expect(seen).toEqual(['(ab|cd)', 'a', 'c', 'y']);
  });

  it('leaving a lookaround follows continueOutside, otherwise the walk ends there', () => {
    expect(trail('(?=a)b', 'a', 'next')).toEqual([]);
    expect(
      trail('(?=ab)c', 'a', 'next', { continueOutside: () => true }),
    ).toEqual(['b', 'c']);
    expect(
      trail('(?=ab)c', 'a', 'next', { continueOutside: () => false }),
    ).toEqual(['b']);
  });

  it('leave can rewrite the state on the way out', () => {
    const ast = parse('ab');
    const out = followPaths<number>(find(ast, 'a'), 'enter', 0, {
      join: (s) => Math.max(...s),
      leave: (_n, s) => s + 1,
    });
    expect(out).toBe(2);
  });

  it('an explicit direction overrides the one implied by position', () => {
    const seen: string[] = [];
    followPaths<number>(
      find(parse('abc'), 'c'),
      'next',
      0,
      { join: (s) => Math.max(...s), enter: (n, s) => (seen.push(n.raw), s) },
      'rtl',
    );
    expect(seen).toEqual(['b', 'a']);
  });
});

describe('quantifier typing', () => {
  it('Quantifier nodes carry min and max', () => {
    let q: Quantifier | undefined;
    walkQuantifiers(parse('a{2,5}'), { enter: (x) => (q = x) });
    expect([q!.min, q!.max]).toEqual([2, 5]);
  });
});
