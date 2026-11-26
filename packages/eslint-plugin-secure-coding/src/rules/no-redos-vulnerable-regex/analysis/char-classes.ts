/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * Derived from `refa` v0.12.1 (JS.parseCharSet / JS.createCharSet) and
 * `regexp-ast-analysis` v0.7.1 (Chars), Copyright (c) 2020 and 2021
 * respectively, Michael Schmidt, MIT License. See THIRD_PARTY_NOTICES.md
 * at the package root. Upstream commit: not recorded in the published tarballs
 * (no `gitHead`); the npm release is the pinned reference.
 *
 * What changed: refa ships ~800 KB of generated tables and a compiler for them.
 * regex-data/unicode-12-1.ts keeps only the property and case-folding data, re-encoded to
 * ~130 KB and decoded lazily, one table at a time, the first time a pattern
 * names it.
 */
import type { Node } from './ast';
import { CharSet } from './char-set';
import { UnsupportedPatternError } from './unsupported';
import {
  FOLD_UNICODE,
  FOLD_UTF16,
  PROPERTY_INDEX,
  PROPERTY_TABLES,
} from '../../../regex-data/unicode-12-1';

/** The five regex flags that change which characters a pattern element matches. */
export interface Flags {
  ignoreCase: boolean;
  unicode: boolean;
  unicodeSets: boolean;
  dotAll: boolean;
  multiline: boolean;
}

const BMP = 0xffff;
const ASTRAL = 0x10ffff;

/** `true` when the flags select code-point (not code-unit) matching. */
export const isUnicode = (flags: Flags): boolean =>
  flags.unicode || flags.unicodeSets;

export const maxChar = (flags: Flags): number =>
  isUnicode(flags) ? ASTRAL : BMP;

const range = (max: number, lo: number, hi: number): CharSet =>
  CharSet.of(max, [[lo, hi]]);

const DIGIT: ReadonlyArray<[number, number]> = [[0x30, 0x39]];
const WORD: ReadonlyArray<[number, number]> = [
  [0x30, 0x39],
  [0x41, 0x5a],
  [0x5f, 0x5f],
  [0x61, 0x7a],
];
const SPACE: ReadonlyArray<[number, number]> = [
  [0x09, 0x0d],
  [0x20, 0x20],
  [0xa0, 0xa0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
];
const LINE_TERMINATOR: ReadonlyArray<[number, number]> = [
  [0x0a, 0x0a],
  [0x0d, 0x0d],
  [0x2028, 0x2029],
];

// ---------------------------------------------------------------------------
// Case equivalence
// ---------------------------------------------------------------------------

interface Fold {
  groups: ReadonlyArray<readonly number[]>;
  /** code point -> the group it belongs to, for the small sets that dominate. */
  byCodePoint: ReadonlyMap<number, readonly number[]>;
}

const folds: [Fold | undefined, Fold | undefined] = [undefined, undefined];

/** Every group of 2+ code points that are the same character ignoring case. */
function foldTable(unicode: boolean): Fold {
  const slot = unicode ? 1 : 0;
  let fold = folds[slot];
  if (fold === undefined) {
    const groups = (unicode ? FOLD_UNICODE : FOLD_UTF16).map((g) =>
      g.split(',').map((n) => parseInt(n, 36)),
    );
    const byCodePoint = new Map<number, readonly number[]>();
    for (const group of groups)
      for (const cp of group) byCodePoint.set(cp, group);
    fold = { groups, byCodePoint };
    folds[slot] = fold;
  }
  return fold;
}

/** Sets this small are walked member by member; larger ones group by group. */
const SMALL_SET = 128;

/** Add every case variant of every member. */
function caseClosure(set: CharSet, unicode: boolean): CharSet {
  if (set.isEmpty) return set;
  const { groups, byCodePoint } = foldTable(unicode);
  const extra: Array<[number, number]> = [];
  const addGroup = (group: readonly number[]): void => {
    for (const cp of group) extra.push([cp, cp]);
  };
  if (set.size <= SMALL_SET) {
    const r = set.ranges;
    for (let i = 0; i < r.length; i += 2) {
      for (let cp = r[i]; cp <= r[i + 1]; cp++) {
        const group = byCodePoint.get(cp);
        if (group !== undefined) addGroup(group);
      }
    }
  } else {
    for (const group of groups)
      if (group.some((cp) => set.has(cp))) addGroup(group);
  }
  return extra.length === 0 ? set : set.union(CharSet.of(set.maximum, extra));
}

// ---------------------------------------------------------------------------
// Unicode property escapes
// ---------------------------------------------------------------------------

const decoded = new Map<number, CharSet>();

/** Decode one range table (see regex-data/unicode-12-1.ts) into a full-range set. */
function decodeTable(index: number): CharSet {
  let set = decoded.get(index);
  if (set === undefined) {
    const nums = PROPERTY_TABLES[index].split(',').map((n) => parseInt(n, 36));
    const pairs: Array<[number, number]> = [];
    let prev = 0;
    for (let i = 0; i < nums.length; i += 2) {
      const lo = prev + nums[i];
      prev = lo + nums[i + 1];
      pairs.push([lo, prev]);
    }
    set = CharSet.of(ASTRAL, pairs);
    decoded.set(index, set);
  }
  return set;
}

const GC_KEYS = new Set(['General_Category', 'gc']);
const SC_KEYS = new Set(['Script', 'sc']);

/** The table index for `\\p{key}` or `\\p{key=value}`, or `undefined` when unknown. */
function propertyIndex(key: string, value: string | null): number | undefined {
  if (value === null)
    return PROPERTY_INDEX[`gc:${key}`] ?? PROPERTY_INDEX[`bin:${key}`];
  if (GC_KEYS.has(key)) return PROPERTY_INDEX[`gc:${value}`];
  if (SC_KEYS.has(key)) return PROPERTY_INDEX[`sc:${value}`];
  // The parser admits only General_Category, Script and Script_Extensions here.
  return PROPERTY_INDEX[`scx:${value}`];
}

/** Property escapes exist only under `u`/`v`, so the set always spans the full range. */
function propertySet(key: string, value: string | null): CharSet {
  const index = propertyIndex(key, value);
  if (index === undefined)
    throw new UnsupportedPatternError(`unknown Unicode property ${key}`);
  return decodeTable(index);
}

// ---------------------------------------------------------------------------
// Chars (regexp-ast-analysis)
// ---------------------------------------------------------------------------

const EMPTY = [CharSet.empty(BMP), CharSet.empty(ASTRAL)] as const;
const ALL = [CharSet.all(BMP), CharSet.all(ASTRAL)] as const;
const LINE_TERMINATORS = [
  CharSet.of(BMP, LINE_TERMINATOR),
  CharSet.of(ASTRAL, LINE_TERMINATOR),
] as const;
const wordSets: Array<CharSet | undefined> = [];

const width = (flags: Flags): 0 | 1 => (isUnicode(flags) ? 1 : 0);

/** Empty set for these flags. Shared: the analysis asks for it constantly. */
export const emptyChars = (flags: Flags): CharSet => EMPTY[width(flags)];
/** Every character for these flags. */
export const allChars = (flags: Flags): CharSet => ALL[width(flags)];
/** Characters a line-boundary assertion can sit next to. */
export const lineTerminatorChars = (flags: Flags): CharSet =>
  LINE_TERMINATORS[width(flags)];

/** `\w`, including the two non-ASCII characters that fold into it under `/iu`. */
export function wordChars(flags: Flags): CharSet {
  const slot = width(flags) * 2 + (flags.ignoreCase ? 1 : 0);
  let set = wordSets[slot];
  if (set === undefined) {
    set = CharSet.of(maxChar(flags), WORD);
    if (slot === 3) set = caseClosure(set, true);
    wordSets[slot] = set;
  }
  return set;
}

// ---------------------------------------------------------------------------
// AST -> CharSet (refa JS.parseCharSet)
// ---------------------------------------------------------------------------

/** `true` for nodes `toCharSet` accepts. */
export const isCharacterLike = (node: Node): boolean =>
  node.type === 'Character' ||
  node.type === 'CharacterSet' ||
  node.type === 'CharacterClass' ||
  node.type === 'ExpressionCharacterClass';

const cache = new WeakMap<Node, Array<CharSet | undefined>>();

/** The four bits of `Flags` that change what a node matches, packed. */
const flagKey = (f: Flags): number =>
  (f.ignoreCase ? 1 : 0) |
  (f.unicode ? 2 : 0) |
  (f.unicodeSets ? 4 : 0) |
  (f.dotAll ? 8 : 0);

/**
 * The set of code points one character-matching node can consume.
 *
 * @throws {UnsupportedPatternError} for a `v`-flag class holding multi-character
 * strings (`[\q{ab}]`, `\p{RGI_Emoji}`) — those are not character sets, and a
 * caller that cannot model them must decline rather than guess.
 */
export function toCharSet(node: Node, flags: Flags): CharSet {
  let byFlags = cache.get(node);
  if (byFlags === undefined) {
    byFlags = [];
    cache.set(node, byFlags);
  }
  const key = flagKey(flags);
  return (byFlags[key] ??= build(node, flags));
}

function fold(set: CharSet, flags: Flags): CharSet {
  return flags.ignoreCase ? caseClosure(set, isUnicode(flags)) : set;
}

function build(node: Node, flags: Flags): CharSet {
  const max = maxChar(flags);
  switch (node.type) {
    case 'Character':
      return fold(range(max, node.value, node.value), flags);
    case 'CharacterSet':
      switch (node.kind) {
        case 'any':
          return flags.dotAll
            ? CharSet.all(max)
            : CharSet.of(max, LINE_TERMINATOR).negate();
        case 'digit':
          return node.negate
            ? CharSet.of(max, DIGIT).negate()
            : CharSet.of(max, DIGIT);
        case 'space':
          return node.negate
            ? CharSet.of(max, SPACE).negate()
            : CharSet.of(max, SPACE);
        case 'word':
          return node.negate ? wordChars(flags).negate() : wordChars(flags);
        default: {
          if (node.strings)
            throw new UnsupportedPatternError('property of strings');
          const base = propertySet(node.key, node.value);
          return fold(node.negate ? base.negate() : base, flags);
        }
      }
    case 'CharacterClass': {
      let set = CharSet.empty(max);
      for (const el of node.elements) {
        if (el.type === 'CharacterClassRange') {
          set = set.union(range(max, el.min.value, el.max.value));
        } else {
          set = set.union(build(el, flags));
        }
      }
      set = fold(set, flags);
      return node.negate ? set.negate() : set;
    }
    case 'ExpressionCharacterClass': {
      const set = build(node.expression, flags);
      return node.negate ? set.negate() : set;
    }
    case 'ClassIntersection':
      return build(node.left, flags).intersect(build(node.right, flags));
    case 'ClassSubtraction':
      return build(node.left, flags).without(build(node.right, flags));
    case 'ClassStringDisjunction': {
      let set = CharSet.empty(max);
      for (const alt of node.alternatives) {
        if (alt.elements.length !== 1)
          throw new UnsupportedPatternError('string alternative');
        set = set.union(
          fold(range(max, alt.elements[0].value, alt.elements[0].value), flags),
        );
      }
      return set;
    }
    default:
      throw new UnsupportedPatternError(node.type);
  }
}
