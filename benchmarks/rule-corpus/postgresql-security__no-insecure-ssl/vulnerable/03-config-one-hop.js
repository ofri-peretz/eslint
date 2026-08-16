/**
 * VULNERABLE (CWE-319) - The config object is built one binding away from the
 * constructor, which is how every real application writes it.
 */
import { Client } from 'pg';

const connectionConfig = {
  host: process.env.PGHOST,
  port: 5432,
  ssl: { rejectUnauthorized: false },
};

export function connect() {
  return new Client(connectionConfig);
}
