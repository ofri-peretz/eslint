/**
 * VULNERABLE - Structured logging: the PII is a property of an object literal
 * passed to console. This is how anyone shipping JSON logs to Datadog or
 * CloudWatch writes it, so it is not an exotic shape.
 */
export function recordUnderwritingStage(applicant) {
  console.info({
    stage: 'underwriting',
    applicantSsn: applicant.ssn,
    submittedAt: Date.now(),
  });
}
