/**
 * VULNERABLE - ADVERSARIAL. There IS a guard and it is about something else
 * entirely. A feature flag authorizes nothing about a destination.
 */
import { useRouter } from 'next/navigation';

export function useGo(flags) {
  const router = useRouter();
  const next = new URL(window.location.href).searchParams.get('next');
  return () => {
    if (flags.newNavigation) {
      router.push(next);
    }
  };
}
