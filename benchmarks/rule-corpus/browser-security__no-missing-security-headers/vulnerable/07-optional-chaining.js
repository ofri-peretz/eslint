/** VULNERABLE - a handler that tolerates a missing response object. The
 *  optional call still sets exactly one header when it runs. */
export function harden(res) {
  res?.setHeader('X-Content-Type-Options', 'nosniff');
}
