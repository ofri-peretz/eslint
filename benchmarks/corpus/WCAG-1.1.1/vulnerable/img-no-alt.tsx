// WCAG 1.1.1 — img element missing alt attribute
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — bare <img> with no text alternative
export function Avatar({ src }: { src: string }) {
  return <img src={src} className="rounded-full" />;
}
