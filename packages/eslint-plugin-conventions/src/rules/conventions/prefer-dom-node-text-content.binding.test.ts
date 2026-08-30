/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `.innerText` is the evidence. Nothing else is consulted.
 *
 * The rule used to gate on a name vocabulary —
 * `^(element|el|div|span|node|ref|dom|elem)$` plus an `(Element|Node|Ref)$`
 * suffix — and six of seven genuine DOM elements were missed for having
 * ordinary names:
 *
 *     const heading = document.getElementById('x');
 *     heading.innerText;                             // not reported
 *
 * `innerText` is defined on `HTMLElement` and nowhere else in the language, so
 * anything you read it from is a DOM element. A second "does this look like an
 * element" test can only subtract, and it did.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { preferDomNodeTextContent } from './prefer-dom-node-text-content';

const count = (code: string): number =>
  new Linter({ configType: 'flat' })
    .verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tsParser as never, ecmaVersion: 2022, sourceType: 'module' },
          plugins: { c: { rules: { r: preferDomNodeTextContent as never } } },
          rules: { 'c/r': 'error' },
        },
      ],
      'subject.ts',
    )
    .filter((m) => m.ruleId === 'c/r').length;

describe('reported whatever the element is called', () => {
  it.each(['element', 'heading', 'title', 'banner', 'button', 'container', 'row'])(
    'const %s = document.getElementById(...)',
    (name) => {
      expect(count(`const ${name} = document.getElementById("x");\nconst t = ${name}.innerText;`)).toBe(1);
    },
  );
});

describe('reported however the element arrived', () => {
  it('a function parameter', () => {
    // The case that convinced me to delete the gate rather than replace it:
    // resolving the binding to a `document.*` call would still have missed this.
    expect(count('function f(el) { return el.innerText; }')).toBe(1);
  });

  it('an undeclared identifier', () => {
    expect(count('const t = element.innerText;')).toBe(1);
  });

  it('an inline query', () => {
    expect(count('const t = document.querySelector("x").innerText;')).toBe(1);
  });

  it('a computed access', () => {
    expect(count('const t = heading["innerText"];')).toBe(1);
  });

  it('an assignment target', () => {
    expect(count('heading.innerText = "x";')).toBe(1);
  });
});

describe('only innerText', () => {
  it('textContent is already correct and stays quiet', () => {
    expect(count('const t = heading.textContent;')).toBe(0);
  });

  it('an unrelated property stays quiet', () => {
    expect(count('const t = heading.innerHTML;')).toBe(0);
  });
});
