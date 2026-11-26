// CWE-319: Cleartext Transmission of Sensitive Information — bearer token over TLS
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST NOT be flagged
// Same call, over a TLS channel.
import * as grpc from '@grpc/grpc-js';

const client = new pkg.Accounts(target, grpc.credentials.createSsl());
const md = new grpc.Metadata();
md.add('authorization', `Bearer ${token}`);
client.GetAccount({ id }, md, (err, account) => {});
