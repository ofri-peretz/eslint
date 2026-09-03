/**
 * SAFE — `Object.hasOwn` before the read.
 *
 * `Object.hasOwn(record, '__proto__')` is false for a plain object, so the guard
 * excludes every inherited property including the dangerous three. This is the
 * modern spelling of the `Object.prototype.hasOwnProperty.call(...)` idiom and
 * is what MDN now recommends.
 */
export function readColumn(record, column) {
  if (!Object.hasOwn(record, column)) {
    return null;
  }
  return record[column];
}
