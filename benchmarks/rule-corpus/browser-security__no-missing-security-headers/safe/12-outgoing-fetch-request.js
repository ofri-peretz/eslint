/** SAFE - ADVERSARIAL. A `headers` object on an OUTGOING request. Demanding a
 *  Content-Security-Policy on a request the app is making is nonsense; the
 *  key name is identical to a ResponseInit's and only the surrounding AST
 *  tells them apart. */
export async function loadOrders(token) {
  return fetch('/api/orders', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}
