/**
 * SAFE - `lastIndexOf` compared against `length - needle.length` IS a suffix
 * check. The shape the rule reports is the one that forgot the comparison.
 */
export function endsWithHost(url) {
  const needle = '.example.com';
  return url.lastIndexOf(needle) === url.length - needle.length;
}
