/**
 * SAFE FOR THIS RULE - `request` is not `fetch` and not an axios verb, so there
 * is no proven request API here. `no-http-urls` still reports the URL.
 */
import request from 'superagent';

export function legacyGet() {
  return request.get('http://api.acme-corp.io/v1/legacy');
}
