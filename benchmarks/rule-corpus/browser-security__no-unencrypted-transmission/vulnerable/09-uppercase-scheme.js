/**
 * VULNERABLE - ADVERSARIAL. Uppercase scheme on a connection string. This rule
 * already lowercases before matching; the fixture pins that it keeps doing so
 * while the anchoring change lands.
 */
export const MONGO_URL = 'MONGODB://svc:pw@db.acme-corp.io:27017/orders';
