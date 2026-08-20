/**
 * SAFE (wave 2) - `.join` on an array this module built from literals. If
 * `join` is added to the passthrough list without asking what it is joining,
 * every static array becomes tainted text.
 */
const FIELDS = ['id', 'name', 'createdAt'];

export function projectionUrl() {
  return `https://api.example.com/v1/items?fields=${FIELDS.join(',')}`;
}
