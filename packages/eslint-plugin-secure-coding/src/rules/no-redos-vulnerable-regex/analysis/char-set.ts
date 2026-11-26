/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An immutable set of code points, stored as sorted, disjoint, non-adjacent
 * inclusive ranges in one flat array `[lo0, hi0, lo1, hi1, ...]`.
 *
 * This is the only piece of `refa` (RunDevelopment/refa, MIT, v0.12.1) the ReDoS
 * rule ever used: set algebra over characters. `refa` is an automata library —
 * NFAs, DFAs, a regex transformer, 800 KB of Unicode tables — and the rule asked
 * it for `union`, `intersect`, `negate`, `isDisjointWith` and a few predicates.
 * Those are rewritten here as linear merges over the range array and allocate
 * nothing but the result.
 */
export class CharSet {
  /** Largest code point that can be a member: 0xFFFF, or 0x10FFFF for `u`/`v`. */
  readonly maximum: number;
  /** Flat `[lo, hi, lo, hi, ...]`. Treat as read-only. */
  readonly ranges: readonly number[];

  private constructor(maximum: number, ranges: readonly number[]) {
    this.maximum = maximum;
    this.ranges = ranges;
  }

  static empty(maximum: number): CharSet {
    return new CharSet(maximum, []);
  }

  static all(maximum: number): CharSet {
    return new CharSet(maximum, [0, maximum]);
  }

  /** The single range `[lo, hi]`, clamped to `maximum`: no sorting, no intermediate arrays. */
  static range(maximum: number, lo: number, hi: number): CharSet {
    return new CharSet(
      maximum,
      lo > hi || lo > maximum ? [] : [lo, Math.min(hi, maximum)],
    );
  }

  /**
   * Build from `[lo, hi]` pairs in any order, overlapping or not. Pairs are
   * clamped to `[0, maximum]`; a pair wholly above `maximum` is dropped.
   */
  static of(
    maximum: number,
    pairs: ReadonlyArray<readonly [number, number]>,
  ): CharSet {
    const sorted = pairs
      .filter(([lo, hi]) => lo <= hi && lo <= maximum)
      .map(([lo, hi]) => [lo, Math.min(hi, maximum)] as const)
      .sort((a, b) => a[0] - b[0]);
    const out: number[] = [];
    for (const [lo, hi] of sorted) {
      const last = out.length - 1;
      if (last >= 0 && lo <= out[last] + 1) {
        if (hi > out[last]) out[last] = hi;
      } else {
        out.push(lo, hi);
      }
    }
    return new CharSet(maximum, out);
  }

  get isEmpty(): boolean {
    return this.ranges.length === 0;
  }

  get isAll(): boolean {
    return (
      this.ranges.length === 2 &&
      this.ranges[0] === 0 &&
      this.ranges[1] === this.maximum
    );
  }

  /** Number of code points in the set. */
  get size(): number {
    let n = 0;
    for (let i = 0; i < this.ranges.length; i += 2)
      n += this.ranges[i + 1] - this.ranges[i] + 1;
    return n;
  }

  has(cp: number): boolean {
    const r = this.ranges;
    let lo = 0;
    let hi = (r.length >> 1) - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cp < r[mid * 2]) hi = mid - 1;
      else if (cp > r[mid * 2 + 1]) lo = mid + 1;
      else return true;
    }
    return false;
  }

  union(...others: CharSet[]): CharSet {
    return others.reduce<CharSet>((acc, other) => acc.union2(other), this);
  }

  private union2(other: CharSet): CharSet {
    if (other.isEmpty) return this;
    if (this.isEmpty) return other;
    const a = this.ranges;
    const b = other.ranges;
    const out: number[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
      let lo: number;
      let hi: number;
      if (j >= b.length || (i < a.length && a[i] <= b[j])) {
        lo = a[i];
        hi = a[i + 1];
        i += 2;
      } else {
        lo = b[j];
        hi = b[j + 1];
        j += 2;
      }
      const last = out.length - 1;
      if (last >= 0 && lo <= out[last] + 1) {
        if (hi > out[last]) out[last] = hi;
      } else {
        out.push(lo, hi);
      }
    }
    return new CharSet(this.maximum, out);
  }

  intersect(other: CharSet): CharSet {
    const a = this.ranges;
    const b = other.ranges;
    const out: number[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      const lo = Math.max(a[i], b[j]);
      const hi = Math.min(a[i + 1], b[j + 1]);
      if (lo <= hi) out.push(lo, hi);
      if (a[i + 1] < b[j + 1]) i += 2;
      else j += 2;
    }
    return new CharSet(this.maximum, out);
  }

  negate(): CharSet {
    const a = this.ranges;
    const out: number[] = [];
    let next = 0;
    for (let i = 0; i < a.length; i += 2) {
      if (a[i] > next) out.push(next, a[i] - 1);
      next = a[i + 1] + 1;
    }
    if (next <= this.maximum) out.push(next, this.maximum);
    return new CharSet(this.maximum, out);
  }

  /** Members of this set that are not in `other`. */
  without(other: CharSet): CharSet {
    return this.intersect(other.negate());
  }

  /** No code point is in both sets. Stops at the first shared one, allocating nothing. */
  isDisjointWith(other: CharSet): boolean {
    const a = this.ranges;
    const b = other.ranges;
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] <= b[j + 1] && b[j] <= a[i + 1]) return false;
      if (a[i + 1] < b[j + 1]) i += 2;
      else j += 2;
    }
    return true;
  }

  isSubsetOf(other: CharSet): boolean {
    const a = this.ranges;
    const b = other.ranges;
    let j = 0;
    for (let i = 0; i < a.length; i += 2) {
      while (j < b.length && b[j + 1] < a[i]) j += 2;
      if (j >= b.length || b[j] > a[i] || b[j + 1] < a[i + 1]) return false;
    }
    return true;
  }

  isSupersetOf(other: CharSet): boolean {
    return other.isSubsetOf(this);
  }

  equals(other: CharSet): boolean {
    const a = this.ranges;
    const b = other.ranges;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
}
