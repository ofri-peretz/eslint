// CWE-319: Cleartext Transmission of Sensitive Information — insecure gRPC bound to loopback
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST NOT be flagged
// Verbatim below: ofri-peretz/security-research protocol-ctf/lib/grpc.mjs (every grpc lab binds through it)
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
export { grpc };
export function loadProto(file) {
  const def = protoLoader.loadSync(file, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
  return { def, pkg: grpc.loadPackageDefinition(def) };
}
export function bind(server, id, port, host = '127.0.0.1') {
  server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) { console.error(err); process.exit(1); }
    console.log(`[ctf] ${id} listening on ${host}:${port} (gRPC, plaintext)  (Ctrl+C to stop)`);
  });
}
