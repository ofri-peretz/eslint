/**
 * VULNERABLE - `axois` (transposed `io` -> `oi`) pulled in as a namespace
 * import. An HTTP client is the highest-value squat target there is: it sees
 * every outbound request, including the Authorization header below.
 */
import * as axois from 'axois';

const client = axois.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 5_000,
});

export async function fetchAccount(id, token) {
  const { data } = await client.get(`/accounts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
