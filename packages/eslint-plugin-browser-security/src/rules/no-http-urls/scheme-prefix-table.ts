/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Lives beside `no-http-urls` and is shared with `no-unencrypted-transmission` so the two cannot
 * disagree about what a URI-scheme prefix table is.
 *
 * `['', 'http://www.', 'https://', 'tel:', 'ftp://ftp.', 'ftp://anonymous:anonymous@']`
 * is the NFC Forum URI-record prefix table: each entry is the abbreviation
 * encoded into a tag, followed on the wire by the rest of the URI. Nothing in it
 * is a destination, because none of its entries names a host.
 *
 * An entry is a PREFIX when it is written down with no host:
 *   - empty, or a bare `scheme:` (`tel:`, `mailto:`);
 *   - `scheme://` alone;
 *   - `scheme://` plus one DNS label and its dot (`www.`, `ftp.`), which cannot
 *     be a complete host;
 *   - `scheme://` plus userinfo ending in `@` (`anonymous:anonymous@`), where
 *     the host is still to come.
 *
 * A table is only recognised when EVERY element is such a prefix and there are
 * at least two. One real URL beside the prefixes (`'http://example.test/a'`)
 * disqualifies the whole array, so a lookup table cannot hide a destination.
 */
const SCHEME = '[a-z][a-z0-9+.-]*';
const BARE_SCHEME = new RegExp(`^${SCHEME}:$`, 'i');
const AUTHORITY_PREFIX = new RegExp(
  `^${SCHEME}://(?:|[a-z0-9-]+\\.|[^/@?#]*@)$`,
  'i',
);

function isSchemePrefix(value: string): boolean {
  return (
    value === '' || BARE_SCHEME.test(value) || AUTHORITY_PREFIX.test(value)
  );
}

/** Is this string a member of an array literal that is a scheme-prefix table? */
export function isInSchemePrefixTable(node: TSESTree.Node): boolean {
  const parent = node.parent;
  if (parent?.type !== AST_NODE_TYPES.ArrayExpression) return false;
  const { elements } = parent;
  return (
    elements.length >= 2 &&
    elements.every(
      (element) =>
        element !== null &&
        element.type === AST_NODE_TYPES.Literal &&
        typeof element.value === 'string' &&
        isSchemePrefix(element.value),
    )
  );
}
