/**
 * SAFE - **the third name probe.** `lineBuffer` is a plain JavaScript ARRAY of
 * strings, not a Buffer. An out-of-range array index is `undefined`, not a
 * read of adjacent memory, so CWE-126 does not apply at all — whatever the
 * variable happens to be called.
 */
export function joinContinuations(lines) {
  const lineBuffer = [];
  for (const line of lines) lineBuffer.push(line.trimEnd());
  const lastIndex = lineBuffer.length - 1;
  return lineBuffer[lastIndex] ?? '';
}
