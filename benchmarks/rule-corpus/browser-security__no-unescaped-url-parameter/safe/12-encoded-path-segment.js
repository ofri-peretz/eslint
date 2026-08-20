/**
 * SAFE - `encodeURI` on the whole path segment. Different encoder, same proof:
 * the value that lands in the URL came out of a call, and a value passed INTO a
 * function is not the value that comes back out.
 */
export function docUrl(slug) {
  return `https://docs.example.com/v2/pages/${encodeURI(slug)}/content`;
}
