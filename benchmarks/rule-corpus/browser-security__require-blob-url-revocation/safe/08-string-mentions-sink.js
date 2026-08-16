/**
 * SAFE - The sink appears only inside a string literal.
 */
export const LEAK_HINT =
  'every URL.createObjectURL must be paired with URL.revokeObjectURL';

export function warn() {
  console.warn(LEAK_HINT);
}
