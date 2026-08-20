/**
 * SAFE - `carpoolClient` is a ride-sharing API client. It is not a database at
 * all. The only thing it shares with a pg Pool is four letters.
 */
import { Pool } from 'pg';
import { carpoolClient } from '../lib/carpool-api';

export const pool = new Pool();

export async function beginRide(riderId) {
  return carpoolClient.query('BEGIN', { riderId });
}
