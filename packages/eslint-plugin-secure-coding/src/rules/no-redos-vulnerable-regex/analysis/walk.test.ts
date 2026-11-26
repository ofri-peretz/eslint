/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RegExpParser } from '@eslint-community/regexpp';
import { describe, expect, it } from 'vitest';
import { walkQuantifiers } from './walk';

const parse = (source: string) =>
  new RegExpParser().parsePattern(source, 0, source.length, { unicode: true });

describe('walkQuantifiers', () => {
  it('enters before and leaves after the element, in source order', () => {
    const log: string[] = [];
    walkQuantifiers(parse('a+(b*c?)+|d{2}'), {
      enter: (q) => log.push(`> ${q.raw}`),
      leave: (q) => log.push(`< ${q.raw}`),
    });
    expect(log).toEqual([
      '> a+',
      '< a+',
      '> (b*c?)+',
      '> b*',
      '< b*',
      '> c?',
      '< c?',
      '< (b*c?)+',
      '> d{2}',
      '< d{2}',
    ]);
  });

  it('descends into lookarounds and capturing groups, and ignores boundaries', () => {
    const seen: string[] = [];
    walkQuantifiers(parse('(?<=x+)(?=y*)(?!z?)^\\b([a-z]+)$'), {
      leave: (q) => seen.push(q.raw),
    });
    expect(seen).toEqual(['x+', 'y*', 'z?', '[a-z]+']);
  });

  it('either callback may be omitted', () => {
    const seen: string[] = [];
    walkQuantifiers(parse('a+'), { enter: (q) => seen.push(q.raw) });
    walkQuantifiers(parse('a+'), { leave: (q) => seen.push(`l${q.raw}`) });
    expect(seen).toEqual(['a+', 'la+']);
  });
});
