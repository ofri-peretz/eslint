/**
 * VULNERABLE - A submitted form field. `new FormData(form).get(...)` is the
 * same container shape as URLSearchParams and was equally invisible.
 */
export function submit(form) {
  const data = new FormData(form);
  return fetch(`https://api.example.com/v1/subscribe?email=${data.get('email')}`);
}
