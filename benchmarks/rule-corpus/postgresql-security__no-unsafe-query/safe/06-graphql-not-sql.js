/**
 * SAFE (pg driver in file) - A GraphQL document, not SQL.
 */
import { Pool } from 'pg';
const db = new Pool();
import { client } from '../lib/gql';

export function user(id) {
  return client.query({ query: USER_QUERY, variables: { id } });
}
