/**
 * VULNERABLE - The router is optional-chained because it is null during the
 * first server render. The navigation is exactly as steerable.
 */
import { useRouter } from 'next/navigation';

export function useReturnTo() {
  const router = useRouter();
  return () => router?.push(window.location.hash.slice(1));
}
