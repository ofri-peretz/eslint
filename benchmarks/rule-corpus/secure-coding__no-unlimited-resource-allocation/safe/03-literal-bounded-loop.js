/**
 * SAFE - A fixed 1 MB, ten times. Both the size and the trip count are
 * constants in the source; nobody outside the process can move either.
 */
function warmUp() {
  const bufs = [];
  for (let i = 0; i < 10; i++) {
    bufs.push(Buffer.alloc(1024 * 1024));
  }
  return bufs.length;
}

module.exports = { warmUp };
