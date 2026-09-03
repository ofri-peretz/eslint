/**
 * VULNERABLE (adversarial) - the impostor loaded through a sub-path entry
 * point. npm resolves `loadsh/fp` by installing the package `loadsh`; the
 * squat is identical, only the entry file differs.
 */
import fp from 'loadsh/fp';
import 'raect/dist/react.production.min.js';

const { compose, map } = fp;

export const normalizeUsers = compose(
  map((user) => ({ ...user, email: String(user.email).toLowerCase() })),
);
