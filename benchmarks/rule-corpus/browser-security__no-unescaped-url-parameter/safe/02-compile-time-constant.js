/**
 * SAFE - A compile-time constant. Reported by the old rule because `PARAM`
 * matched a case-insensitive `\bparam\b` — a false positive that needed no
 * user input at all to trigger.
 */
const PARAM = 'static';

export function fixedUrl() {
  return `https://api.example.com/v1/items?q=${PARAM}`;
}
