/**
 * Unit tests for the JSX static-value helpers shared by the rules.
 */
import { describe, expect, it } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  attributeValue,
  DYNAMIC,
  hasAccessibleChild,
  staticAttributeValue,
} from './jsx-static';

/** The first JSX element of `code`. */
function element(code: string): TSESTree.JSXElement {
  const ast = parse(code, { ecmaFeatures: { jsx: true }, jsx: true });
  const stmt = ast.body[0] as TSESTree.ExpressionStatement;
  return stmt.expression as TSESTree.JSXElement;
}

const attr = (code: string): TSESTree.JSXAttribute =>
  element(code).openingElement.attributes[0] as TSESTree.JSXAttribute;

describe('attributeValue', () => {
  it('reads a negative number', () => {
    expect(attributeValue(attr('<div tabIndex={-1} />'))).toBe('-1');
  });

  it('a unary operator on anything else is dynamic', () => {
    expect(attributeValue(attr('<div tabIndex={-x} />'))).toBe(DYNAMIC);
    expect(attributeValue(attr('<div tabIndex={!0} />'))).toBe(DYNAMIC);
  });

  it('sees through a TypeScript `as` / `satisfies`', () => {
    expect(attributeValue(attr('<div role={"button" as const} />'))).toBe(
      'button',
    );
    expect(
      attributeValue(attr('<div role={"button" satisfies string} />')),
    ).toBe('button');
  });

  it('a JSX element as the value is dynamic', () => {
    expect(attributeValue(attr('<div title=<b /> />'))).toBe(DYNAMIC);
    expect(staticAttributeValue(attr('<div title=<b /> />'))).toBeNull();
  });

  it('a conditional with different branches is dynamic', () => {
    expect(attributeValue(attr('<div role={f ? "a" : "b"} />'))).toBe(DYNAMIC);
  });
});

describe('hasAccessibleChild', () => {
  it('a spread child is not content it can see', () => {
    expect(hasAccessibleChild(element('<a>{...items}</a>').children)).toBe(
      false,
    );
  });

  it('null and an empty expression render nothing', () => {
    expect(hasAccessibleChild(element('<a>{null}</a>').children)).toBe(false);
    expect(hasAccessibleChild(element('<a>{/* note */}</a>').children)).toBe(
      false,
    );
  });

  it('a template with an expression is content it cannot see', () => {
    expect(hasAccessibleChild(element('<a>{`${x}`}</a>').children)).toBe(true);
  });

  it('a boolean child renders nothing', () => {
    expect(hasAccessibleChild(element('<a>{false}</a>').children)).toBe(false);
  });

  it('a fragment with text is content', () => {
    expect(hasAccessibleChild(element('<a><>Docs</></a>').children)).toBe(true);
  });
});
