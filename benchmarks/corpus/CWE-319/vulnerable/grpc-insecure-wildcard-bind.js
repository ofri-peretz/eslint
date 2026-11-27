// CWE-319: Cleartext Transmission of Sensitive Information — insecure gRPC on every interface
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST be detected
// Plaintext credentials, bound to 0.0.0.0: every network the host is on can read the traffic.
import * as grpc from '@grpc/grpc-js';

const server = new grpc.Server();
server.addService(service, implementation);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {});
