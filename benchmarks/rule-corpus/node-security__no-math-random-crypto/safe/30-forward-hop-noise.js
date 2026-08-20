/**
 * SAFE (wave 3) - the forward-binding walk must not turn every relayed random
 * number into a finding.
 *
 * `raw` is relayed through two locals exactly like vulnerable/32, and lands in
 * a setTimeout. If this reports, the hop is firing on the HOP rather than on
 * what the value became.
 */
'use strict';

function scheduleCompaction(run) {
  const raw = Math.random();
  const scaled = raw * 5 * 60_000;
  const when = 60_000 + scaled;
  return setTimeout(run, when);
}

module.exports = { scheduleCompaction };
