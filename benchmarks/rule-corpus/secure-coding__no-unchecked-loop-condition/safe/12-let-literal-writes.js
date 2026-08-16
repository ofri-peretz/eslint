/**
 * SAFE - A `let` bound whose every write is a literal owned by this file. The
 * variable is reassigned, so a naive "is it const?" test fails, but no write
 * introduces attacker data.
 *
 * Adversarial intent: the counterpart of a `let` reassigned from the network.
 * Mutability is not taint; the writes decide.
 */
function planSweep(tier) {
  let passes = 3;
  if (tier === 'deep') {
    passes = 8;
  } else if (tier === 'quick') {
    passes = 1;
  }

  const scheduled = [];
  for (let i = 0; i < passes; i++) {
    scheduled.push(`pass-${i}`);
  }
  return scheduled;
}

module.exports = { planSweep };
