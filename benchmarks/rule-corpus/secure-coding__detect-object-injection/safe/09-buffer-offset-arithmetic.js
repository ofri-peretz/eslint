/**
 * ADVERSARIAL, SAFE — index arithmetic where nothing is named like an index.
 *
 * `frameStart`, `stride` and `channel` are all function parameters; no
 * declaration proves any of them numeric on its own. What proves the key numeric
 * is the ARITHMETIC: `a + b` between two provably-numeric operands, `x * y`,
 * `n - 1`. A string key can never be produced, so no prototype is reachable.
 *
 * This is the shape that makes an "index-looking NAMES" allowlist unsound in
 * both directions at once — it clears `function put(o, k) { o[k] = 1 }` and it
 * misses every real index not on the list.
 */
export function extractChannel(samples, frameStart, stride, channel) {
  const out = [];

  for (let frame = 0; frame < 128; frame++) {
    out[frame] = samples[frameStart + frame * stride + channel];
  }

  return out;
}
