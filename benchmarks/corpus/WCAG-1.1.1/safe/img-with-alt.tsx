// WCAG 1.1.1 — safe, descriptive alt text
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
export function Avatar({ src, name }: { src: string; name: string }) {
  return <img src={src} alt={`${name}'s avatar`} className="rounded-full" />;
}
