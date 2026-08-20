/** SAFE - an HTTP CLIENT call. It matches the method name and is not a route:
 *  it cannot carry middleware, and the CSRF token it needs is attached by the
 *  interceptor below, not by a route registration. */
import axios from 'axios';

axios.interceptors.request.use((config) => {
  config.headers['X-CSRF-Token'] = readTokenFromMeta();
  return config;
});

export async function submitOrder(cart) {
  return axios.post('/api/orders', cart);
}
