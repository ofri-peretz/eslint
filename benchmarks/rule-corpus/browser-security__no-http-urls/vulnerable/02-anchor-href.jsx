/**
 * VULNERABLE - A link is a navigation, so it is not mixed content — but it is
 * still a cleartext destination, and it is where users are sent to type things.
 */
export function Footer() {
  return <a href="http://legacy.acme-corp.io/support">Contact support</a>;
}
