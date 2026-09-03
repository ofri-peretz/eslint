/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * WHERE in a URL does an interpolation land?
 *
 * The question the rule this replaced never asked. It matched
 * `/\bhttps?:\/\//` against `sourceCode.getText(node)` — the *source text* of
 * the expression, comments and all — and then reported any interpolation
 * anywhere in it. Two things follow from doing it properly instead:
 *
 * 1. **The URL is read as a value, not as source.** The static text is
 *    assembled from the template's cooked quasis and the string literals of a
 *    `+` chain, with each interpolation recorded at its offset in that text. A
 *    comment that mentions `https://` contributes nothing, and
 *    `` `${scheme}://${host}` `` is not mistaken for a literal URL.
 *
 * 2. **The authority is not this rule's business.** An interpolation BEFORE the
 *    first `/`, `?` or `#` of the authority chooses the scheme or the host —
 *    that is an open redirect (CWE-601) and belongs to `no-insecure-redirects`
 *    and `require-url-validation`. Only what lands in the path, query or
 *    fragment is an encoding defect (CWE-79 / CWE-116), and only those holes
 *    are offered to the rule.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, staticString } from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

/** One interpolation, and where its result lands in the assembled URL text. */
export interface UrlHole {
  expression: TSESTree.Expression;
  offset: number;
}

export interface UrlShape {
  /** The statically-known characters, holes contributing nothing. */
  text: string;
  holes: UrlHole[];
}

interface Accumulator {
  text: string;
  holes: UrlHole[];
}

/** `https://`, `ftp://`, or the protocol-relative `//`. */
const AUTHORITY_PREFIX = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

/** A path, a query or a fragment — anything a relative URL may start with. */
const RELATIVE_PREFIX = /^[./?#]/;

function collect(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  out: Accumulator,
): void {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    node.quasis.forEach((quasi, index) => {
      // `cooked` is null only for an invalid escape, which only a TAGGED
      // template may hold — and `collect` is handed an expression node, so a
      // tagged template arrives as `TaggedTemplateExpression` and never gets
      // here. An UNTAGGED template with a bad escape is a parse error.
      out.text += quasi.value.cooked!;
      const expression = node.expressions[index];
      if (expression !== undefined) {
        out.holes.push({ expression, offset: out.text.length });
      }
    });
    return;
  }

  // `#field in obj` is the only shape whose left is a PrivateIdentifier, and
  // its operator is `in` — so the `+` test already excludes it.
  if (
    node.type === AST_NODE_TYPES.BinaryExpression &&
    node.operator === '+'
  ) {
    collect(node.left as TSESTree.Node, sourceCode, out);
    collect(node.right, sourceCode, out);
    return;
  }

  const staticText = staticString(node);
  if (staticText !== null) {
    out.text += staticText;
    return;
  }

  // `const BASE = 'https://api.example.com'; BASE + '/x?q=' + q` — a constant
  // prefix is still a prefix, and without this the whole chain looks relative.
  if (node.type === AST_NODE_TYPES.Identifier) {
    const init = resolveInitializer(node, sourceCode);
    if (
      init !== undefined &&
      init.type === AST_NODE_TYPES.Literal &&
      typeof init.value === 'string'
    ) {
      out.text += init.value;
      return;
    }
  }

  out.holes.push({
    expression: node as TSESTree.Expression,
    offset: out.text.length,
  });
}

/** Assemble the static text of a template or `+` chain, holes marked. */
export function urlShape(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): UrlShape {
  const out: Accumulator = { text: '', holes: [] };
  collect(node, sourceCode, out);
  return out;
}

/**
 * Does the static text look like a URL, and if so is it absolute?
 *
 * `'absolute'` carries its own scheme/authority and is a URL wherever it
 * appears. `'relative'` — `/api/x`, `./x`, `?q=` — only becomes one when it
 * reaches a URL sink, which the rule checks separately; on its own it is
 * indistinguishable from an ordinary path string.
 */
export function urlKind(text: string): 'absolute' | 'relative' | null {
  if (AUTHORITY_PREFIX.test(text)) return 'absolute';
  if (RELATIVE_PREFIX.test(text)) return 'relative';
  return null;
}

/**
 * Is this hole in the path, query or fragment — the part encoding protects?
 *
 * Everything up to and including the authority is the open-redirect family's;
 * see the header.
 */
export function isEncodingPosition(shape: UrlShape, hole: UrlHole): boolean {
  const authority = AUTHORITY_PREFIX.exec(shape.text);
  const from = authority === null ? 0 : authority[0].length;
  for (let index = from; index < shape.text.length; index += 1) {
    const character = shape.text[index];
    if (character !== '/' && character !== '?' && character !== '#') continue;
    return index < hole.offset;
  }
  return false;
}
