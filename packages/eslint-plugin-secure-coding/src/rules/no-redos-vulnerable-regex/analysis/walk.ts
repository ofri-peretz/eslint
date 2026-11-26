/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import type { Node, Quantifier } from './ast';

/** Callbacks for {@link walkQuantifiers}. */
export interface QuantifierVisitor {
  enter?(quantifier: Quantifier): void;
  leave?(quantifier: Quantifier): void;
}

/**
 * Visit every quantifier in source order, calling `enter` before its element
 * and `leave` after it. Descends into groups, alternatives and lookarounds;
 * character classes have no quantifiers inside, so they are not entered.
 */
export function walkQuantifiers(node: Node, visitor: QuantifierVisitor): void {
  switch (node.type) {
    case 'Pattern':
    case 'CapturingGroup':
    case 'Group':
    case 'Assertion':
      if ('alternatives' in node)
        for (const a of node.alternatives) walkQuantifiers(a, visitor);
      break;
    case 'Alternative':
      for (const e of node.elements) walkQuantifiers(e, visitor);
      break;
    case 'Quantifier':
      visitor.enter?.(node);
      walkQuantifiers(node.element, visitor);
      visitor.leave?.(node);
      break;
  }
}
