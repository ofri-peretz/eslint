/**
 * Cross-file fixture: a database pool built in its own module, the way MCP
 * servers keep their connection setup out of the tool file.
 */
import { Pool } from 'pg';

export const pool = new Pool();
