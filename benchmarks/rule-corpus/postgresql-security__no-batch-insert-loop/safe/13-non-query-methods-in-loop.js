/**
 * SAFE - A loop full of client calls, none of which is a query: checkouts,
 * releases and listeners. The sink is `query`, not "a method on a database
 * handle".
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function warmConnections(count) {
  const clients = [];
  for (let index = 0; index < count; index += 1) {
    const client = await pool.connect();
    client.on('error', (error) => console.error(error));
    clients.push(client);
  }
  for (const client of clients) {
    client.release();
  }
}
