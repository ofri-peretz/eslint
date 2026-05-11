// WCAG 1.1.1 — <input type="image"> missing alt
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — image-typed input acts as a button, screen readers need a label
export function SearchButton() {
  return <input type="image" src="/search.png" />;
}
