/**
 * SAFE - Plain operational telemetry with no PII vocabulary at all. This is the
 * baseline control: if a rule reports HERE, it is not reading names, it is
 * reporting every console call.
 */
export function finishJob(job) {
  console.log('job finished', job.durationMs);
  console.log('records processed', job.recordCount);
}
