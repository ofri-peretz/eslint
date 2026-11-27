// CWE-770: Allocation of Resources Without Limits or Throttling — gRPC message size cap kept
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST NOT be flagged
// A raised but bounded cap: 16 MiB.
import * as grpc from '@grpc/grpc-js';

export const server = new grpc.Server({
  'grpc.max_receive_message_length': 16 * 1024 * 1024,
});
