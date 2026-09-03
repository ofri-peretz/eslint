/**
 * VULNERABLE - Loopback deliberately does NOT exempt these schemes. This exact
 * string gets copied to staging with the host swapped and the credentials
 * intact, which is how the secret escapes.
 */
export const MONGO_URL = 'mongodb://admin:devpass@localhost:27017/app';
