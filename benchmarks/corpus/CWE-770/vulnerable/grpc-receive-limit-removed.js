// CWE-770: Allocation of Resources Without Limits or Throttling — gRPC message size cap removed
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST be detected
// -1 lifts gRPC's 4 MiB receive cap, so one request can make the server buffer any size.
import * as grpc from '@grpc/grpc-js';

export const server = new grpc.Server({
  'grpc.max_receive_message_length': -1,
});
