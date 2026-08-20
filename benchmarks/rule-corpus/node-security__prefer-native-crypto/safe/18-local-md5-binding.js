/**
 * ADVERSARIAL SAFE - a local const named `md5` bound to node:crypto. The name
 * matches a package the rule reports on; the module does not.
 */
import { createHash } from 'node:crypto';

const md5 = (value) => createHash('md5').update(value).digest('hex');

export const cacheKey = (parts) => md5(parts.join('|'));
