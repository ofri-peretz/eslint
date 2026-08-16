/**
 * SAFE - synthetic latency in a local load generator, in TypeScript.
 *
 * The randomness models a network, and the only consumer is a chart in the
 * developer's terminal.
 */
interface Sample {
  readonly endpoint: string;
  readonly latencyMs: number;
}

const ENDPOINTS: readonly string[] = ['/health', '/v1/items', '/v1/items/:id'];

export function drawSample(): Sample {
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)] as string;
  const latencyMs = Math.round(5 + Math.random() * 120);
  return { endpoint, latencyMs };
}

export function drawBatch(size: number): Sample[] {
  return Array.from({ length: size }, () => drawSample());
}
