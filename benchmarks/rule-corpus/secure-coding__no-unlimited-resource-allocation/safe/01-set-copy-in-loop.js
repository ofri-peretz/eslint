/**
 * SAFE - 107 of this rule's 173 findings across 20 repositories were this one
 * expression. `Set` takes an ITERABLE, not a size: copying `scc` allocates
 * what the program is already holding, and no input makes it larger.
 *
 * directus api/src/utils/build-import-plan.ts:124
 */
function collect(components) {
  const out = [];
  for (const scc of components) {
    const sccSet = new Set(scc);
    out.push(sccSet.size);
  }
  return out;
}

module.exports = { collect };
