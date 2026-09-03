/**
 * SAFE (wave 2) - a `let` in the same accumulator shape as vulnerable/07 and
 * vulnerable/23, whose every write is a literal.
 *
 * The Math.random() in this file picks a shard for a metrics counter. Nothing
 * flows from it into `sessionLabel`.
 */
'use strict';

const SHARDS = 8;

function recordVisit(metrics, anonymous) {
  let sessionLabel = 'anonymous';
  if (!anonymous) {
    sessionLabel = 'known';
  }

  const shard = Math.floor(Math.random() * SHARDS);
  metrics.increment(`visits.${sessionLabel}.shard${shard}`);
  return sessionLabel;
}

module.exports = { recordVisit };
