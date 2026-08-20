/**
 * VULNERABLE - A delete over cleartext. The verb varies; the transport does not.
 */
import axios from 'axios';

export function removeUser(id) {
  return axios.delete('http://api.acme-corp.io/v1/users/' + id);
}
