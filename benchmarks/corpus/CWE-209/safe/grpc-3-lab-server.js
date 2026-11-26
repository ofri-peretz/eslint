// CWE-209: Generation of Error Message Containing Sensitive Information — fixed error details
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST NOT be flagged
// Verbatim below: ofri-peretz/security-research protocol-ctf/challenges/grpc/grpc-3/server.mjs
// grpc-3 Stream Filter: a reporting service that streams orders matching a user-supplied filter.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grpc, loadProto, bind } from '../../../lib/grpc.mjs';
import { flagFor } from '../../../lib/flags.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { pkg } = loadProto(path.join(here, 'orders.proto'));
const PORT = 41203;

// Server-side secret, as it would be in an env var. Never sent to clients.
process.env.PAYMENTS_SIGNING_KEY = flagFor('grpc-3');

const ORDERS = [
  { id: 'o-1', status: 'shipped', total: 79.5, note: '' },
  { id: 'o-2', status: 'pending', total: 12.0, note: '' },
  { id: 'o-3', status: 'shipped', total: 240.0, note: 'gift wrap' },
];
const ALLOWED = /^[\w\s.<>=!&|"'()+\-*/,$`{}\[\]:?]*$/; // "only expression characters"

const server = new grpc.Server();
server.addService(pkg.orders.Orders.service, {
  Stream(call) {
    const filter = call.request.filter || 'true';
    if (filter.length > 300 || !ALLOWED.test(filter)) {
      { call.emit('error', { code: grpc.status.INVALID_ARGUMENT, details: 'invalid filter' }); return; }
    }
    let pred;
    try {
      // Fast and flexible: compile the filter once into a predicate.
      pred = new Function('o', `return (${filter});`);
    } catch {
      { call.emit('error', { code: grpc.status.INVALID_ARGUMENT, details: 'filter does not compile' }); return; }
    }
    for (const order of ORDERS) {
      const row = { ...order };
      try { if (pred(row)) call.write(row); } catch { /* skip bad rows */ }
    }
    call.end();
  },
});
bind(server, 'grpc-3', PORT);
