/**
 * VULNERABLE - The implied-eval form of setTimeout: a STRING first argument is
 * compiled by the engine. The retry delay looks innocuous; the payload is the
 * first argument.
 */
export function scheduleRetry(req) {
  setTimeout('applyPatch("' + req.query.patchId + '")', 250);
}
