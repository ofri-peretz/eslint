// WCAG 1.1.1 — safe, decorative image with empty alt
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// alt="" is the WCAG-correct way to mark a decorative image; screen readers skip it
export function DividerOrnament() {
  return <img src="/divider.svg" alt="" aria-hidden="true" />;
}
