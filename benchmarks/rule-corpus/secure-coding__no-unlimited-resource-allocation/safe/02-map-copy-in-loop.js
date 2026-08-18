/**
 * SAFE - Same argument as the Set case. `new Map(entries)` is a copy.
 *
 * webpack lib/ChunkGraph.js:769, npm/cli add-rm-pkg-deps.js:65
 */
function index(groups) {
  return groups.map((group) => new Map(group.entries));
}

module.exports = { index };
