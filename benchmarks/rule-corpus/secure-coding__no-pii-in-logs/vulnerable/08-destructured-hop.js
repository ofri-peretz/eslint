/**
 * VULNERABLE - One binding hop. The exact same two values are logged, but they
 * arrive as plain identifiers because the caller destructured first. Nothing
 * about the leak changed; only the node type at the call site did.
 */
export function submitKyc(applicant) {
  const { email, ssn } = applicant;
  console.log('KYC submitted', email, ssn);
}
