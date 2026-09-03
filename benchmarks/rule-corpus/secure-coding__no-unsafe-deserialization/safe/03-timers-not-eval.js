/**
 * SAFE - setTimeout in its ordinary scheduler form. The first argument is a
 * function reference, so nothing is compiled. The `await new Promise(resolve =>
 * setTimeout(resolve, ms))` idiom below is the single most common line in the
 * Node ecosystem and reported at CRITICAL for years.
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startPoller(job, intervalMs) {
  return setInterval(() => job.run(), intervalMs);
}
