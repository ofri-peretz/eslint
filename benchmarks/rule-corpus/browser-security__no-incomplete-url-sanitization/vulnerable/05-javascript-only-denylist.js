/**
 * VULNERABLE - A scheme denylist that stops at `javascript:`. `data:text/html;base64,…`
 * executes script in `href` on every current browser and is never mentioned.
 */
export function sanitize(href) {
  if (href.trim().toLowerCase().startsWith('javascript:')) {
    return '#';
  }
  return href;
}
