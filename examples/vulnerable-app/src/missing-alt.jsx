// FLAGSHIP: react-a11y/alt-text · WCAG 1.1.1 / Section 508
// <img> without an alt attribute fails screen-reader requirements
// and is the most-cited a11y violation in audits.

import React from 'react';

export function ProductCard({ product }) {
  return (
    <article>
      {/* ❌ Vulnerable: missing alt — screen readers say nothing here */}
      <img src={product.imageUrl} />
      <h3>{product.name}</h3>
    </article>
  );
}

export function Avatar({ user }) {
  // ❌ Even with `role="img"`, the alt is still required for screen readers.
  return <img src={user.avatarUrl} role="img" />;
}

// ✅ Safe equivalents:
//   <img src={product.imageUrl} alt={product.name} />
//   <img src={user.avatarUrl} alt={`Avatar for ${user.name}`} />
