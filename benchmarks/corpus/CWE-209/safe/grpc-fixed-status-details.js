// CWE-209: Generation of Error Message Containing Sensitive Information — fixed gRPC details
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-27
// This MUST NOT be flagged
// The caught error is logged server-side; the client gets a fixed message.
import * as grpc from '@grpc/grpc-js';

const server = new grpc.Server();
server.addService(service, {
  GetOrder(call, callback) {
    try {
      callback(null, orders.find(call.request.id));
    } catch (err) {
      log.error(err);
      callback({ code: grpc.status.INTERNAL, details: 'internal error' });
    }
  },
});
