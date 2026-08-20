/**
 * SAFE - The allocation is in the for-INIT, so it runs once however dynamic
 * `t` is. Minified library code is full of this shape, and it reported 7 times
 * across the corpus.
 */
function fill(t) {
  for (var e = Array(t), u = 0; u < t; u++) {
    e[u] = u;
  }
  return e;
}

module.exports = { fill };
