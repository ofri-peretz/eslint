/** SAFE - ADVERSARIAL. A build-time guard that REFUSES to ship the directive.
 *  The token appears only inside the message explaining the refusal; this file
 *  is the strongest anti-eval code in the repo and must not be a finding. */
const FORBIDDEN = ["'unsafe-eval'", "'unsafe-inline'"];

export function assertPolicySafe(policy) {
  for (const source of FORBIDDEN) {
    if (policy.includes(source)) {
      throw new Error(
        `Refusing to ship a Content-Security-Policy containing ${source}.`,
      );
    }
  }
}
