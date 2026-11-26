// CWE-290: Authentication Bypass by Spoofing — identity resolved from a server-side token table
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST NOT be flagged
// Verbatim below: ofri-peretz/security-research protocol-ctf/solutions/grpc-1/fixed-server.mjs
// Reference fix for grpc-1 Trust the Gateway: an internal accounts backend. In production it sits behind an API
// gateway that validates tokens and forwards the caller's identity in metadata.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grpc, loadProto, bind } from '../../lib/grpc.mjs';
import { flagFor } from '../../lib/flags.mjs';

const here = path.resolve('challenges/grpc/grpc-1');
const { pkg } = loadProto(path.join(here, 'bank.proto'));
const PORT = 41201;

const ACCOUNTS = {
  'acc-1001': { owner: 'guest', balance_cents: 1250, memo: 'Coffee fund' },
  'acc-0001': { owner: 'treasury', balance_cents: 9_000_000_00, memo: flagFor('grpc-1') },
};
const TOKENS = { 'guest-token': 'guest' }; // what the gateway accepts; your token

function callerOf(metadata) {
  // FIX: the backend authenticates every call itself. Identity headers from a gateway are only
  // acceptable when the hop is authenticated (mTLS / signed JWT from the gateway), never as a bare header.
  const auth = String(metadata.get('authorization')[0] ?? '');
  return TOKENS[auth.replace(/^Bearer\s+/i, '')] ?? null;
}

const server = new grpc.Server();
server.addService(pkg.bank.Accounts.service, {
  GetAccount(call, cb) {
    const user = callerOf(call.metadata);
    if (!user) return cb({ code: grpc.status.UNAUTHENTICATED, details: 'missing credentials' });
    const acc = ACCOUNTS[call.request.account_id];
    if (!acc) return cb({ code: grpc.status.NOT_FOUND, details: 'no such account' });
    if (acc.owner !== user) return cb({ code: grpc.status.PERMISSION_DENIED, details: `account belongs to ${acc.owner}` });
    cb(null, { account_id: call.request.account_id, ...acc });
  },
});
bind(server, 'grpc-1', PORT);
