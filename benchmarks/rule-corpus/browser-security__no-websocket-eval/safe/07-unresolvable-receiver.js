/**
 * SAFE FOR THIS RULE - ADVERSARIAL. The receiver arrives as a PARAMETER, so this
 * file cannot prove it is a WebSocket. An unresolvable receiver is not
 * "probably a WebSocket" — it is unknown, and unknown belongs to `no-eval`,
 * which reports it without claiming a provenance it cannot prove.
 */
export function attach(channel) {
  channel.onmessage = (event) => {
    eval(event.data);
  };
}
