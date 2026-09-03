/**
 * SAFE - The bound is a product of two module constants. There is no request
 * data anywhere in this file; the loop runs exactly 5000 times, always.
 */
const batchLimit = 50;
const batchWidth = 100;

export function preallocateSlots() {
  const slots = [];
  for (let i = 0; i < batchLimit * batchWidth; i++) {
    slots.push(null);
  }
  return slots;
}
