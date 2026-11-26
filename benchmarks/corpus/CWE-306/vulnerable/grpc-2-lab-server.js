// CWE-306: Missing Authentication for Critical Function — gRPC reflection served unguarded
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST be detected
// Verbatim below: ofri-peretz/security-research protocol-ctf/challenges/grpc/grpc-2/server.mjs
// grpc-2 Hidden Methods. BLACK-BOX CHALLENGE: solve it without reading this file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import protoLoader from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';
import { grpc, bind } from '../../../lib/grpc.mjs';
import { flagFor } from '../../../lib/flags.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 41202;

// Internal ops API, compiled into the same binary. "Nobody outside knows it exists."
const INTERNAL = `syntax = "proto3";
package ops;
service Maintenance {
  rpc ExportTable (ExportRequest) returns (ExportResult);
}
message ExportRequest { string table = 1; }
message ExportResult { string table = 1; repeated string rows = 2; }
`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctf-grpc2-'));
fs.writeFileSync(path.join(tmp, 'ops.proto'), INTERNAL);

const def = protoLoader.loadSync([path.join(here, 'catalog.proto'), path.join(tmp, 'ops.proto')],
  { keepCase: true, defaults: true });
const pkg = grpc.loadPackageDefinition(def);

const PRODUCTS = [
  { sku: 'KB-01', name: 'Mechanical keyboard', price_cents: 12900 },
  { sku: 'MS-02', name: 'Wireless mouse', price_cents: 4900 },
  { sku: 'HD-03', name: 'USB-C hub', price_cents: 3900 },
];
const TABLES = {
  users: ['1,alice@shop.example,admin', '2,bob@shop.example,staff'],
  api_keys: [`payments-prod,${flagFor('grpc-2')}`],
};

const server = new grpc.Server();
server.addService(pkg.shop.Catalog.service, {
  Search(call, cb) {
    const q = String(call.request.query).toLowerCase();
    cb(null, { products: PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)) });
  },
});
server.addService(pkg.ops.Maintenance.service, {
  ExportTable(call, cb) {
    const t = call.request.table;
    if (!t) return cb({ code: grpc.status.INVALID_ARGUMENT, details: `table is required. tables: ${Object.keys(TABLES).join(', ')}` });
    if (!TABLES[t]) return cb({ code: grpc.status.NOT_FOUND, details: 'no such table' });
    cb(null, { table: t, rows: TABLES[t] });
  },
});
// Reflection is great for Postman and grpcurl during development...
new ReflectionService(def).addToServer(server);
bind(server, 'grpc-2', PORT);
