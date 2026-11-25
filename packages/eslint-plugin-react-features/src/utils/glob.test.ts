/**
 * Tests for the glob matcher behind jsx-pascal-case's `ignore`.
 * Expectations are minimatch's, with `noglobstar`, for the patterns a
 * component name can meet.
 */
import { describe, expect, it } from 'vitest';
import { globMatch } from './glob';

describe('globMatch', () => {
  it.each([
    ['IGNORED', 'IGNORED', true],
    ['IGNORED', 'IGNORE', false],
    ['TEST_D_D', '*_D*D', true],
    ['TEST_X', '*_D*D', false],
    ['A_DEPRECATED', '*_+(DEPRECATED|IGNORED)', true],
    ['A_IGNORED', '*_+(DEPRECATED|IGNORED)', true],
    ['A_OTHER', '*_+(DEPRECATED|IGNORED)', false],
    ['A_', '*_*(X|Y)', true],
    ['A_XY', '*_*(X|Y)', true],
    ['A_Z', '*_?(X|Y)', false],
    ['A_X', '*_?(X|Y)', true],
    ['A_X', '*_@(X|Y)', true],
    ['A_XX', '*_@(X|Y)', false],
    ['FooBar', '!(Baz)', true],
    ['Baz', '!(Baz)', false],
    ['Foo_a', 'Foo_[ab]', true],
    ['Foo_c', 'Foo_[ab]', false],
    ['Foo_c', 'Foo_[!ab]', true],
    ['Foo_a', 'Foo_[!ab]', false],
    ['Foo_a', 'Foo_?', true],
    ['Foo_ab', 'Foo_?', false],
    ['Foo_BAR', 'Foo_{BAR,BAZ}', true],
    ['Foo_QUX', 'Foo_{BAR,BAZ}', false],
    ['Foo_bar', '!Foo_*', false],
    ['Other', '!Foo_*', true],
    ['Foo.Bar', 'Foo.Bar', true],
    ['FooxBar', 'Foo.Bar', false],
    ['Foo', 'Foo**', true],
    ['A$B', 'A$B', true],
    ['A(B', 'A(B', true],
  ])('%s against %s is %s', (name, pattern, expected) => {
    expect(globMatch(name, pattern)).toBe(expected);
  });

  it('treats an unclosed group as plain text', () => {
    expect(globMatch('A(B', 'A(B')).toBe(true);
    expect(globMatch('A[B', 'A[B')).toBe(true);
    expect(globMatch('A{B', 'A{B')).toBe(true);
    expect(globMatch('A{B}', 'A{B}')).toBe(true);
  });

  it('reads a backslash as an escape', () => {
    expect(globMatch('A*B', 'A\\*B')).toBe(true);
    expect(globMatch('AxB', 'A\\*B')).toBe(false);
    // an escaped bar is part of an alternative, not a separator
    expect(globMatch('a|b', '+(a\\|b)')).toBe(true);
    expect(globMatch('a', '+(a\\|b)')).toBe(false);
    // a trailing backslash stands for itself
    expect(globMatch('A\\', 'A\\')).toBe(true);
  });

  it('treats an extglob with no closing parenthesis as plain text', () => {
    expect(globMatch('+(abc', '+(abc')).toBe(true);
    expect(globMatch('abc', '+(abc')).toBe(false);
  });

  it('reads groups inside groups', () => {
    expect(globMatch('b', '+(a|@(b|c))')).toBe(true);
    expect(globMatch('ac', '+(a|@(b|c))')).toBe(true);
    expect(globMatch('d', '+(a|@(b|c))')).toBe(false);
    expect(globMatch('c', '{a,{b,c}}')).toBe(true);
    expect(globMatch('d', '{a,{b,c}}')).toBe(false);
    // an escaped parenthesis does not close the group
    expect(globMatch('a)', '+(a\\))')).toBe(true);
  });
});
