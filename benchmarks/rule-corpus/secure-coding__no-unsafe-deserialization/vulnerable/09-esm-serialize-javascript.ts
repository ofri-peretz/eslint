/**
 * VULNERABLE (adversarial) - The consumer half of `serialize-javascript`. The
 * package's own README says its output must be evaluated; when the blob comes
 * back from a cache an attacker can write to, evaluating it is RCE.
 */
import { createClient } from 'redis';

const redis = createClient();

export async function restoreState(sessionId: string): Promise<unknown> {
  const blob = await redis.get(`state:${sessionId}`);
  return new Function(`return ${blob};`)();
}
