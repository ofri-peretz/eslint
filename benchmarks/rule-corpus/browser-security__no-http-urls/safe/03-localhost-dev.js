/**
 * SAFE - A dev server never leaves the machine. `*.localhost` is reserved for
 * loopback by RFC 6761 and is just as local as the bare name.
 */
export const devProxy = {
  target: 'http://localhost:8080',
  preview: 'http://app.localhost:4000',
};
