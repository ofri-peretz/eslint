/**
 * SAFE - A GraphQL document, not SQL.
 */
import { client } from '../lib/gql';

export function user(id) {
  return client.query({ query: USER_QUERY, variables: { id } });
}
