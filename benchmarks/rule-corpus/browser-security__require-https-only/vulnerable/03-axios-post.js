/**
 * VULNERABLE - A POST body is the payload people assume is protected. It is not.
 */
import axios from 'axios';

export function submitOrder(cart) {
  return axios.post('http://api.acme-corp.io/v1/orders', cart);
}
