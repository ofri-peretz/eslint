// CWE-532: Insertion of Sensitive Information into Log File — every gRPC header logged
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-26
// This MUST be detected
// getMap() returns every header, the caller's Authorization token included.
import pino from 'pino';

const logger = pino();
server.addService(service, {
  GetAccount(call, callback) {
    logger.info({ headers: call.metadata.getMap() }, 'GetAccount');
    callback(null, accounts.find(call.request.id));
  },
});
