/**
 * Unit tests for the JSX static-value helpers.
 */
import { describe, expect, it } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  attributeValue,
  DYNAMIC,
  expressionValue,
  findAttribute,
  hasSpread,
  isPassed,
  isSetTruthy,
} from './jsx-value';

/** The opening element of the first JSX element in `code`. */
function opening(code: string): TSESTree.JSXOpeningElement {
  const ast = parse(code, { ecmaFeatures: { jsx: true }, jsx: true });
  const stmt = ast.body[0] as TSESTree.ExpressionStatement;
  return (stmt.expression as TSESTree.JSXElement).openingElement;
}

const attr = (code: string): TSESTree.JSXAttribute =>
  opening(code).attributes[0] as TSESTree.JSXAttribute;

describe('attributeValue', () => {
  it.each([
    ['<input checked />', true],
    ['<input type="checkbox" />', 'checkbox'],
    ['<input type={"checkbox"} />', 'checkbox'],
    ['<input type={`checkbox`} />', 'checkbox'],
    ['<input type={flag ? "a" : "a"} />', 'a'],
    ['<input value={undefined} />', undefined],
    ['<input value={null} />', null],
    ['<input readOnly={false} />', false],
    ['<input value={"x" as const} />', 'x'],
    ['<input value={"x" satisfies string} />', 'x'],
    ['<input value={x!} />', DYNAMIC],
  ])('%s -> %s', (code, expected) => {
    expect(attributeValue(attr(code))).toBe(expected);
  });

  it.each([
    '<input value={x} />',
    '<input value={`a${b}`} />',
    '<input value={flag ? "a" : "b"} />',
    '<input value={f()} />',
    '<input value={/* empty */} />',
    '<input value=<b /> />',
  ])('%s is dynamic', (code) => {
    expect(attributeValue(attr(code))).toBe(DYNAMIC);
  });

  it('reads a bare expression too', () => {
    const ast = parse('1n;', {});
    const stmt = ast.body[0] as TSESTree.ExpressionStatement;
    expect(expressionValue(stmt.expression)).toBe(BigInt(1));
  });
});

describe('element helpers', () => {
  it('finds an attribute by exact name, skipping spreads and namespaces', () => {
    const el = opening('<a {...rest} xlink:href="#x" href="/h" />');
    expect(findAttribute(el, 'href')?.value).toMatchObject({ value: '/h' });
    expect(findAttribute(el, 'title')).toBeUndefined();
    expect(hasSpread(el)).toBe(true);
    expect(hasSpread(opening('<a href="/h" />'))).toBe(false);
  });

  it('isPassed: absent, undefined and null are not passed', () => {
    expect(isPassed(undefined)).toBe(false);
    expect(isPassed(attr('<i v={undefined} />'))).toBe(false);
    expect(isPassed(attr('<i v={null} />'))).toBe(false);
    expect(isPassed(attr('<i v={x} />'))).toBe(true);
    expect(isPassed(attr('<i v="" />'))).toBe(true);
  });

  it('isSetTruthy: absent and static falsy are off, dynamic may be on', () => {
    expect(isSetTruthy(undefined)).toBe(false);
    expect(isSetTruthy(attr('<i v={false} />'))).toBe(false);
    expect(isSetTruthy(attr('<i v />'))).toBe(true);
    expect(isSetTruthy(attr('<i v={flag} />'))).toBe(true);
  });
});
