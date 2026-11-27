// CWE-532: Insertion of Sensitive Information into Log File — one non-credential header logged
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST NOT be flagged
// Only the request id is logged, by name.
import pino from 'pino';

const logger = pino();
server.addService(service, {
  GetAccount(call, callback) {
    logger.info({ requestId: call.metadata.get('x-request-id')[0] }, 'GetAccount');
    callback(null, accounts.find(call.request.id));
  },
});
