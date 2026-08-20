/**
 * VULNERABLE (wave 2) - `location['search']`. Identical semantics, one bracket,
 * and every member test in this family compares `property.type === 'Identifier'`
 * before looking at the name.
 */
export function replay() {
  return fetch(`https://api.example.com/v1/replay?state=${location['search']}`);
}
