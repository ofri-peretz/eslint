/**
 * SAFE - The sink appears only inside a string literal.
 */
export const REVIEW_NOTE =
  "reject any PR using file.type.startsWith('image/') as a validation";

export function note() {
  console.info(REVIEW_NOTE);
}
