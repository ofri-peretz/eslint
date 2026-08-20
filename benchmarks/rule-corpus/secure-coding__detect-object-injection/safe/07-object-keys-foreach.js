/**
 * ADVERSARIAL, SAFE — `Object.keys(x).forEach((key) => x[key])`.
 *
 * The most common object-iteration idiom in JavaScript. `key` ranges over the
 * OWN enumerable keys of the very object being indexed, so the read can never
 * reach an inherited property — the same guarantee the rule already grants to
 * `for (const key in obj)` and `for (const key of Object.keys(obj))`, reached
 * through a callback parameter instead of a loop binding.
 *
 * Covering two spellings of one guarantee and not the third is an accident of
 * node types. This is the shape that decides whether the rule is usable on
 * ordinary application code at all.
 */
export function sumUsage(usageByProject) {
  let total = 0;

  Object.keys(usageByProject).forEach((projectKey) => {
    total += usageByProject[projectKey].requestCount;
  });

  return total;
}
