/**
 * SAFE - A window over an array the process already holds. Both ends are
 * derived from `rows.length`, so the loop cannot run longer than the array.
 */
export function sliceWindow(rows, offset) {
  const startIndex = Math.max(0, Math.min(offset, rows.length));
  const endIndex = Math.min(startIndex + 50, rows.length);
  const window = [];
  for (let i = startIndex; i < endIndex; i++) {
    window.push(rows[i]);
  }
  return window;
}
