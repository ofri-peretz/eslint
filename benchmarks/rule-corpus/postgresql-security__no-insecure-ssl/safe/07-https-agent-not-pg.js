/**
 * SAFE - An outbound HTTPS agent in a file that also talks to PostgreSQL. This
 * is a real weakness, but it is `node-security`'s to report, not the pg
 * plugin's - billing the same line twice is how a ruleset loses trust.
 */
import { Pool } from 'pg';
import https from 'node:https';

export const pool = new Pool({ ssl: true });

export const agent = new https.Agent({ rejectUnauthorized: false });
