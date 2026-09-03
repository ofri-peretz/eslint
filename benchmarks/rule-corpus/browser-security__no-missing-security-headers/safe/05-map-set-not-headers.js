/** SAFE - `set` is one of the commonest method names in JavaScript. A feature
 *  flag map is not a response. */
const featureFlags = new Map();

featureFlags.set('newCheckout', true);
featureFlags.set('darkMode', false);

export const flags = featureFlags;
