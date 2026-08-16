/**
 * ADVERSARIAL, false-negative direction — the test nobody runs.
 *
 * Fixture 02 with every identifier renamed to a word carrying no security
 * connotation: no `req`, no `body`, no `user`, no `field`, no `key`. The
 * vulnerability is byte-for-byte identical. Detection must survive the rename,
 * or the rule was reading names rather than evidence.
 */
export function applyEntry(envelope, ledger) {
  const slot = envelope.payload.slot;

  ledger[slot] = envelope.payload.amount;
  return ledger;
}
