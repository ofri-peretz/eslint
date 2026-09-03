/**
 * VULNERABLE - A cleartext database protocol carrying the password inline. The
 * wire is unencrypted AND the credential is in the source.
 */
export const MONGO_URL = 'mongodb://svc_app:s3cret@db.acme-corp.io:27017/orders';
