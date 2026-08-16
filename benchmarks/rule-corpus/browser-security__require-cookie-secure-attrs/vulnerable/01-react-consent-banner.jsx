/**
 * VULNERABLE - A consent cookie with no attributes at all. It rides along on
 * cross-site requests and travels in the clear on any http:// hop.
 */
export function ConsentBanner({ onAccept }) {
  function accept() {
    document.cookie = 'consent=analytics';
    onAccept();
  }

  return <button onClick={accept}>Accept</button>;
}
