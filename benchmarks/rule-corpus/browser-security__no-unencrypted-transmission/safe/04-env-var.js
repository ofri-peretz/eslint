/**
 * SAFE - The connection string comes from the environment, so no protocol is
 * written down and there is nothing to judge. This is also the remediation for
 * the credential half of the problem.
 */
export const MONGO_URL = process.env.MONGO_URL;
