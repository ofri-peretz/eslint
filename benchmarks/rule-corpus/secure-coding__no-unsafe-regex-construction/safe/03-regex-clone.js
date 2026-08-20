/**
 * SAFE - Re-compiling a pattern the engine already accepted. Whoever controlled
 * the original controls the copy and nothing else changed, so there is no new
 * attacker surface. Mongoose's `cloneRegExp` and Fastify's route normaliser are
 * both this line.
 */
export function cloneRegExp(existing) {
  return new RegExp(existing.source, existing.flags);
}

export function anchored(existing) {
  return new RegExp(existing.source + '$', existing.flags);
}
