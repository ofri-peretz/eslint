/**
 * SAFE - A constant pattern written as a string because it is composed from
 * source-controlled parts. Nothing here can change at runtime.
 */
const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';

export const HOSTNAME = new RegExp(`^${LABEL}(?:\\.${LABEL})*$`);

export function isHostname(value) {
  return HOSTNAME.test(value);
}
