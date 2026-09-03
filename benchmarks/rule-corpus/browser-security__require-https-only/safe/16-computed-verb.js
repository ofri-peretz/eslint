/**
 * SAFE FOR THIS RULE - ADVERSARIAL. `axios[verb]` names no statically known
 * method, so there is no proven request API. The URL is still cleartext and
 * `no-http-urls` reports it — declining here costs the family nothing, while
 * guessing would claim a shape this rule cannot actually see.
 */
import axios from 'axios';

export function call(verb) {
  return axios[verb]('http://api.acme-corp.io/v1/things');
}
