/**
 * VULNERABLE - Hostname verification defeated by a no-op `checkServerIdentity`.
 * The certificate chain is still validated, so `rejectUnauthorized` stays true
 * and the code reads as hardened - but any valid certificate for any host is
 * now accepted for this host.
 */
import tls from 'node:tls';
import type { TLSSocketOptions } from 'node:tls';

const options: TLSSocketOptions = {
  rejectUnauthorized: true,
  checkServerIdentity: () => undefined,
};

export function connectToBroker(socket: tls.TLSSocket): tls.TLSSocket {
  return new tls.TLSSocket(socket, options);
}
