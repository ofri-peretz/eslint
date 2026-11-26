// CWE-209: Generation of Error Message Containing Sensitive Information — stack in gRPC details
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST be detected
// The caught error's stack becomes the status details the client receives.
import * as grpc from '@grpc/grpc-js';

const server = new grpc.Server();
server.addService(service, {
  GetOrder(call, callback) {
    try {
      callback(null, orders.find(call.request.id));
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, details: err.stack });
    }
  },
});
