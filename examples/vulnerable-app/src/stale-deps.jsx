// FLAGSHIP: react-features/hooks-exhaustive-deps
// useEffect that closes over a value not declared in its dependency array
// causes stale-closure bugs — the most-deployed React rule on npm.

import React, { useEffect, useState } from 'react';

export function ProductPage({ productId }) {
  const [product, setProduct] = useState(null);

  // ❌ Vulnerable: `productId` is captured in the closure but missing from the deps.
  // When productId changes, this effect doesn't re-run; `setProduct` writes the
  // wrong product into state.
  useEffect(() => {
    fetch(`/api/products/${productId}`).then((r) => r.json()).then(setProduct);
  }, []);

  return product ? <h1>{product.name}</h1> : <p>Loading…</p>;
}

// ✅ Safe equivalent:
//   useEffect(() => { ... }, [productId]);
