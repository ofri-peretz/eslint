// CWE-290: Authentication Bypass by Spoofing — caller identity read from gRPC metadata
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST be detected
// Verbatim below: ofri-peretz/security-research protocol-ctf/challenges/grpc/grpc-1/server.mjs
// grpc-1 Trust the Gateway: an internal accounts backend. In production it sits behind an API
// gateway that validates tokens and forwards the caller's identity in metadata.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grpc, loadProto, bind } from '../../../lib/grpc.mjs';
import { flagFor } from '../../../lib/flags.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { pkg } = loadProto(path.join(here, 'bank.proto'));
const PORT = 41201;

const ACCOUNTS = {
  'acc-1001': { owner: 'guest', balance_cents: 1250, memo: 'Coffee fund' },
  'acc-0001': { owner: 'treasury', balance_cents: 9_000_000_00, memo: flagFor('grpc-1') },
};
const TOKENS = { 'guest-token': 'guest' }; // what the gateway accepts; your token

function callerOf(metadata) {
  // The gateway already authenticated the user and forwards who they are.
  const forwarded = metadata.get('x-authenticated-user')[0];
  if (forwarded) return String(forwarded);
  // Direct callers (local dev, health checks) use a bearer token.
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
