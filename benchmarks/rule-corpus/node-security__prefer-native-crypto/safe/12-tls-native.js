/**
 * SAFE - platform TLS. `node:tls` and `node:https` are the native answer to the
 * certificate work node-forge is usually pulled in for.
 */
import https from 'node:https';
import tls from 'node:tls';

export function fetchPeerCert(host) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host }, () => {
      resolve(socket.getPeerCertificate());
      socket.end();
    });
    socket.on('error', reject);
  });
}

export const agent = new https.Agent({ minVersion: 'TLSv1.2' });
