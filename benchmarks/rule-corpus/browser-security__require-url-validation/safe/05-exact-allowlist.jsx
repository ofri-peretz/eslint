/**
 * SAFE - The CORRECT remediation: an exact allowlist of destinations. The
 * attacker's string either IS one of three known paths or it is not used.
 */
import { useRouter, useSearchParams } from 'next/navigation';

const ALLOWED = new Set(['/dashboard', '/billing', '/settings']);

export default function Continue() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  return <button onClick={() => { if (ALLOWED.has(next)) router.push(next); }}>Go</button>;
}
