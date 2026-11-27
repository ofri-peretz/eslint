// CWE-319: Cleartext Transmission of Sensitive Information — bearer token over a plaintext channel
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST be detected
// The client sends an Authorization header over a channel built with createInsecure().
import * as grpc from '@grpc/grpc-js';

const client = new pkg.Accounts(target, grpc.credentials.createInsecure());
const md = new grpc.Metadata();
md.add('authorization', `Bearer ${token}`);
client.GetAccount({ id }, md, (err, account) => {});
