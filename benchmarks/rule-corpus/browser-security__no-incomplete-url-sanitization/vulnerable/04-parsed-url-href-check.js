/**
 * VULNERABLE - `new URL(location.href).href` is the inbound URL again, one
 * parse later. A substring test over it is the same non-decision.
 */
export function fromParsed() {
  const parsed = new URL(location.href);
  return parsed.href.includes('cdn.example.com');
}
