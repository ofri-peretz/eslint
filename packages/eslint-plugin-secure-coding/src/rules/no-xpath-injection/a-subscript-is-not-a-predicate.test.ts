/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `param[@"fileName"]` is Objective-C. `[@id=` is XPath.
 *
 * Hand-verification run 2026-08-24 against
 * postmanlabs/postman-code-generators. Its Objective-C generator builds source
 * text as JavaScript strings:
 *
 *   bodySnippet += indent + 'if (param[@"fileName"]) {\n';
 *
 * Four CWE-643 findings in a repository with no XPath library, no XPath API
 * call, and no XPath anywhere — the marker `[@` matched Objective-C dictionary
 * subscript.
 *
 * The header comment claimed `[@` was unambiguous, "nothing else in a
 * JavaScript codebase is spelled that way". This is the second marker that
 * turned out to be shared with another language, after `/*` and the React
 * Router wildcard. An XPath attribute predicate names the attribute directly
 * after the `@`, so requiring a name (or `*`) separates the two.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noXpathInjection } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-xpath-injection — a subscript is not a predicate',
  noXpathInjection,
  {
    valid: [
      // The corpus shape.
      `function build(indent) {
         let s = '';
         s += indent + 'if (param[@"fileName"]) {\\n';
         s += indent + '[body appendFormat:@"%@", param[@"value"]];\\n';
         return s;
       }`,
      // Single-quoted subscript, and a Swift dictionary literal.
      `const line = "[dict setObject:v forKey:[@'k']];";`,
    ],
    invalid: [
      // A named attribute predicate is XPath and still reports.
      {
        code: `const xpath = require('xpath'); const q = "//user[@name='" + name + "']"; xpath.select(q, doc);`,
        errors: 1,
      },
      // `[@*]` — any-attribute — is XPath too.
      {
        code: `const xpath = require('xpath'); const q = "//user[@*='" + name + "']"; xpath.select(q, doc);`,
        errors: 1,
      },
    ],
  },
);
