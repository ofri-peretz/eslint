/**
 * SAFE - the loop condition IS the bounds check. `i` cannot reach
 * `frame.length`, so no iteration reads past the end.
 */
export function checksum(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) {
    sum = (sum + frame[i]) & 0xffff;
  }
  return sum;
}
