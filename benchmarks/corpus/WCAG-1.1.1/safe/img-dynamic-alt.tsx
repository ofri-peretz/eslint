// WCAG 1.1.1 — safe, dynamic alt forwarded from props
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// Forwarding alt={alt} is the correct pattern — caller controls the description.
// Reporting it as missing is the false-positive class our pre-fix rule had.
export function MdxImg({ alt, ...props }: { alt: string; src: string }) {
  return <img alt={alt} {...props} />;
}
