/**
 * SAFE - Ordinary accounting code whose identifiers merely CONTAIN the rule's
 * trigger words: `annulled` contains "null", `paramsHash` contains "params",
 * `dataset` contains "data", `bodyweight` contains "body". None of these values
 * comes from a request and none of these comparisons is a type check.
 */
export function summarise(dataset, paramsHash) {
  const annulled = dataset.filter((row) => row.status === 'annulled').length;
  const bodyweight = dataset.reduce((sum, row) => sum + row.weight, 0);
  if (annulled == 1) {
    return { note: 'single annulment', paramsHash, bodyweight };
  }
  return { note: `${annulled} annulments`, paramsHash, bodyweight };
}
