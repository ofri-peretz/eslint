/**
 * ADVERSARIAL, SAFE — control for fixture 07.
 *
 * `for (const [key, value] of Object.entries(source))` carries exactly the same
 * guarantee as the `.forEach` form: `key` is an own enumerable key of `source`.
 * This spelling is already recognised. Keeping both in the corpus makes the
 * inconsistency measurable rather than arguable, and locks the recognised
 * spelling against a regression while the other is being fixed.
 */
export function toHeaderList(headers) {
  const list = [];

  for (const [name, value] of Object.entries(headers)) {
    list.push(`${name}: ${value}`);
  }

  return list;
}
