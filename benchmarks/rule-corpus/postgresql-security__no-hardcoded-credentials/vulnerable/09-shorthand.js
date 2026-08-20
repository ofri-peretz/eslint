/**
 * VULNERABLE (adversarial) - ES6 shorthand folding in a hoisted secret.
 */
import { Client } from 'pg';

const password = 'sh0rthand-s3cret';

export const client = new Client({ user: 'app', password });
