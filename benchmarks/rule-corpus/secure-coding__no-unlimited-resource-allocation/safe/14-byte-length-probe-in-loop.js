/**
 * SAFE - `Buffer.byteLength` is a read-only size PROBE. It allocates nothing,
 * and matched only because the printed callee text contained `Buffer`.
 */
function totalSize(chunks) {
  let total = 0;
  for (const chunk of chunks) {
    total += Buffer.byteLength(chunk);
  }
  return total;
}

module.exports = { totalSize };
