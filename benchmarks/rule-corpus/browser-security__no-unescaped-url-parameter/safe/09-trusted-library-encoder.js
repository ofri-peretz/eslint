/**
 * SAFE - The `trustedLibraries` default, resolved through the import graph
 * rather than by substring-matching the receiver's name. The old rule accepted
 * `curlOptions.get(...)` here because `curl` contains `url`.
 */
import querystring from 'node:querystring';

export function searchUrl(term) {
  return `https://api.example.com/v1/search?term=${querystring.escape(term)}`;
}
