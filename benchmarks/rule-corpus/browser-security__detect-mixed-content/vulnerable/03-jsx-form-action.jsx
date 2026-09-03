/**
 * VULNERABLE - "Mixed form action": the page is HTTPS, the POST is not, so the
 * subscriber's address crosses the network in the clear. Browsers warn on this
 * by name.
 */
export function Subscribe() {
  return (
    <form action="http://forms.acme-corp.io/subscribe" method="post">
      <input name="email" type="email" />
    </form>
  );
}
