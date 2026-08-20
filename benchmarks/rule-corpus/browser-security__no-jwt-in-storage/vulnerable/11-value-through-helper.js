/**
 * VULNERABLE - The value is laundered through a helper. The KEY is still the
 * evidence and it is right there at the sink.
 */
function unwrap(response) {
  return response.data.credentials.value;
}

export async function login() {
  const response = await fetch('/api/session').then((r) => r.json());
  localStorage.setItem('refresh_token', unwrap(response));
}
