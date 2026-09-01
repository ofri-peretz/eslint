// CWE-022: safe — OpenTelemetry context propagation is not archive extraction
// @author        ofri-peretz
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-26
// @source        diia-open-source/be-diia-app@51b50099ca6514f1d44a2cd278b7b58addfdabd8 src/grpc/grpcService.ts:280
// @sealed        node-security/no-zip-slip — a bare .extract() is not an archive
// This MUST NOT be flagged
//
// Found by an outreach scan on 2026-08-25: this shape produced zip-slip
// findings in three unrelated repositories in a single 60-repo sweep, and not
// one of them touched an archive. `extract` here reads trace headers.
const { context, propagation } = require('@opentelemetry/api');

function startServerSpan(headers, tracer, actionName) {
  const telemetryActiveContext = propagation.extract(context.active(), headers);
  return tracer.startSpan(`grpc ${actionName}`, {}, telemetryActiveContext);
}

module.exports = { startServerSpan };
