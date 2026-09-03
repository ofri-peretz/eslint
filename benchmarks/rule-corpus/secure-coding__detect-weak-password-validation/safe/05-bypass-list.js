/**
 * SAFE — a rate-limiter bypass allowlist. Still no password.
 *
 * `bypassList` and `compassHeadings` both contain `pass`; neither contains the
 * WORD `pass`. Real code is full of these — `passthrough`, `passenger`,
 * `bypassCount`, `compass`, `passage`, `passive` — and each one is a "Password
 * length requirement is too weak" finding on code that handles no credentials.
 */
export function shouldRateLimit(request, bypassList, compassHeadings) {
  if (bypassList.length > 0 && bypassList.includes(request.ip)) {
    return false;
  }

  if (compassHeadings.length > 3) {
    return false;
  }

  return true;
}
