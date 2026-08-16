/**
 * VULNERABLE - `router.replace` is the same navigation without a history
 * entry, and `document.URL` is the address bar.
 */
import { useRouter } from 'next/router';

export function bounce() {
  const router = useRouter();
  router.replace(document.URL);
}
