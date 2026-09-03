/**
 * SAFE (adversarial) - `reactn` is a real, published npm package (React with
 * global state, `import { useGlobal } from 'reactn'`). It is one edit from
 * `react` and it is NOT on the rule's hand-maintained legitimate list.
 *
 * This is the key attack on any name-similarity rule: an allowlist is a
 * vocabulary, and the registry keeps publishing names the vocabulary has never
 * heard of. Accusing a real dependency of being malware is the expensive
 * mistake - the rule's own comment says so.
 */
import React from 'react';
import { useGlobal, setGlobal } from 'reactn';

setGlobal({ cart: [] });

export function CartBadge() {
  const [cart] = useGlobal('cart');
  return React.createElement('span', { className: 'badge' }, cart.length);
}
