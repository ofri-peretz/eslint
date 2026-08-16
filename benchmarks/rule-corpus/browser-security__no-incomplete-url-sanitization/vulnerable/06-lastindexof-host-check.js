/**
 * VULNERABLE - `lastIndexOf(...) !== -1` is usually written INTENDING a suffix
 * check, which it only becomes when compared against `length - needle.length`.
 */
export function trusted(redirectUrl) {
  return redirectUrl.lastIndexOf('example.org') !== -1;
}
