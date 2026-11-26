/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { describe, expect, it } from 'vitest';
import { CharSet } from './char-set';

const M = 0xffff;
const s = (...p: Array<[number, number]>) => CharSet.of(M, p);

describe('CharSet', () => {
  it('normalises unordered, overlapping and adjacent pairs', () => {
    expect(s([5, 9], [1, 3], [4, 4], [8, 12]).ranges).toEqual([1, 12]);
    expect(s([1, 2], [4, 5]).ranges).toEqual([1, 2, 4, 5]);
    expect(s([1, 10], [2, 3]).ranges).toEqual([1, 10]);
  });

  it('clamps to the maximum and drops pairs above it or inverted', () => {
    expect(CharSet.of(10, [[5, 99]]).ranges).toEqual([5, 10]);
    expect(CharSet.of(10, [[11, 12]]).isEmpty).toBe(true);
    expect(CharSet.of(10, [[5, 4]]).isEmpty).toBe(true);
  });

  it('empty / all / size / isAll', () => {
    expect(CharSet.empty(M).isEmpty).toBe(true);
    expect(CharSet.empty(M).size).toBe(0);
    expect(CharSet.all(M).isAll).toBe(true);
    expect(CharSet.all(M).size).toBe(M + 1);
    expect(s([0, M - 1]).isAll).toBe(false);
    expect(s([1, M]).isAll).toBe(false);
    expect(s([0, 5], [7, M]).isAll).toBe(false);
    expect(s([2, 4], [9, 9]).size).toBe(4);
  });

  it('range() is the one-pair fast path of of()', () => {
    expect(CharSet.range(10, 3, 5).ranges).toEqual([3, 5]);
    expect(CharSet.range(10, 3, 99).ranges).toEqual([3, 10]);
    expect(CharSet.range(10, 11, 12).isEmpty).toBe(true);
    expect(CharSet.range(10, 5, 4).isEmpty).toBe(true);
    // A single code point is a range of one, including the very last one.
    expect(CharSet.range(10, 3, 3).ranges).toEqual([3, 3]);
    expect(CharSet.range(10, 10, 10).ranges).toEqual([10, 10]);
  });

  it('has() finds members by binary search', () => {
    const set = s([10, 20], [30, 40], [50, 60]);
    for (const cp of [10, 20, 30, 35, 50, 60]) expect(set.has(cp)).toBe(true);
    for (const cp of [0, 9, 21, 29, 41, 49, 61])
      expect(set.has(cp)).toBe(false);
    expect(CharSet.empty(M).has(0)).toBe(false);
  });

  it('union merges, coalesces and short-circuits on empties', () => {
    const a = s([1, 3], [10, 12]);
    const b = s([4, 5], [11, 20]);
    expect(a.union(b).ranges).toEqual([1, 5, 10, 20]);
    expect(b.union(a).ranges).toEqual([1, 5, 10, 20]);
    expect(a.union(CharSet.empty(M))).toBe(a);
    expect(CharSet.empty(M).union(a)).toBe(a);
    expect(a.union(b, s([30, 31])).ranges).toEqual([1, 5, 10, 20, 30, 31]);
    expect(s([1, 9]).union(s([2, 3])).ranges).toEqual([1, 9]);
    expect(s([2, 3]).union(s([1, 9])).ranges).toEqual([1, 9]);
    expect(a.union().ranges).toEqual(a.ranges);
  });

  it('intersect keeps only shared ranges', () => {
    const a = s([1, 10], [20, 30]);
    const b = s([5, 25]);
    expect(a.intersect(b).ranges).toEqual([5, 10, 20, 25]);
    expect(b.intersect(a).ranges).toEqual([5, 10, 20, 25]);
    expect(a.intersect(s([11, 19])).isEmpty).toBe(true);
    expect(a.intersect(CharSet.empty(M)).isEmpty).toBe(true);
    expect(s([1, 5], [7, 9]).intersect(s([0, 100])).ranges).toEqual([
      1, 5, 7, 9,
    ]);
  });

  it('negate is its own inverse and covers both ends', () => {
    expect(s([5, 6]).negate().ranges).toEqual([0, 4, 7, M]);
    expect(s([0, 6]).negate().ranges).toEqual([7, M]);
    expect(s([5, M]).negate().ranges).toEqual([0, 4]);
    expect(CharSet.empty(M).negate().isAll).toBe(true);
    expect(CharSet.all(M).negate().isEmpty).toBe(true);
    expect(s([5, 6], [9, 9]).negate().negate().ranges).toEqual([5, 6, 9, 9]);
  });

  it('without removes the other set', () => {
    expect(s([1, 10]).without(s([4, 5])).ranges).toEqual([1, 3, 6, 10]);
  });

  it('isDisjointWith', () => {
    expect(s([1, 3]).isDisjointWith(s([4, 6]))).toBe(true);
    expect(s([4, 6]).isDisjointWith(s([1, 3]))).toBe(true);
    expect(s([1, 4]).isDisjointWith(s([4, 6]))).toBe(false);
    expect(s([1, 3], [10, 12]).isDisjointWith(s([5, 6], [12, 14]))).toBe(false);
    expect(s([1, 3], [10, 12]).isDisjointWith(s([5, 6], [13, 14]))).toBe(true);
    expect(s([1, 30]).isDisjointWith(s([5, 6], [40, 41]))).toBe(false);
    expect(s([1, 3]).isDisjointWith(CharSet.empty(M))).toBe(true);
  });

  it('isSubsetOf / isSupersetOf', () => {
    expect(s([2, 3]).isSubsetOf(s([1, 5]))).toBe(true);
    expect(s([2, 3], [8, 9]).isSubsetOf(s([1, 5], [7, 9]))).toBe(true);
    expect(s([2, 6]).isSubsetOf(s([1, 5]))).toBe(false);
    expect(s([0, 3]).isSubsetOf(s([1, 5]))).toBe(false);
    expect(s([2, 3]).isSubsetOf(s([8, 9]))).toBe(false);
    expect(s([2, 3]).isSubsetOf(CharSet.empty(M))).toBe(false);
    expect(CharSet.empty(M).isSubsetOf(s([1, 2]))).toBe(true);
    expect(s([1, 5]).isSupersetOf(s([2, 3]))).toBe(true);
    expect(s([2, 3]).isSupersetOf(s([1, 5]))).toBe(false);
  });

  it('equals', () => {
    expect(s([1, 2]).equals(s([1, 2]))).toBe(true);
    expect(s([1, 2]).equals(s([1, 3]))).toBe(false);
    expect(s([1, 2]).equals(s([1, 2], [5, 5]))).toBe(false);
  });
});
