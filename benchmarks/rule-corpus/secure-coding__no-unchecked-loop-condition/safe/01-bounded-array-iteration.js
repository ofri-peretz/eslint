/**
 * SAFE - The bound is the length of a collection the process already holds in
 * memory. Nothing an attacker sends changes the iteration count.
 */
export function summarise(rows) {
  let total = 0;
  for (let i = 0; i < rows.length; i++) {
    total += rows[i].amount;
  }
  return total;
}
