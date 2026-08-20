/**
 * SAFE - `new Uint8Array(fileContents)` COPIES an array that is already in
 * memory; the argument is a payload, not a count. It allocates exactly what
 * the caller already holds, which no peer can inflate.
 */
export function stageUpload(fileContents) {
  const bytes = new Uint8Array(fileContents);
  return new Blob([bytes]);
}
