/**
 * SAFE (adversarial) - `rowBuffer` is a plain ARRAY built by `map`, and the
 * index really does come from the request. An out-of-range array read is
 * `undefined`; no adjacent memory is disclosed, so CWE-126 does not apply.
 *
 * Both halves of the rule's evidence are present in NAME only. A report proves
 * the buffer test is a substring match on the receiver's spelling.
 */
export function page(req, rows) {
  const rowBuffer = rows.map((row) => row.id);
  return rowBuffer[Number(req.query.page)] ?? null;
}
