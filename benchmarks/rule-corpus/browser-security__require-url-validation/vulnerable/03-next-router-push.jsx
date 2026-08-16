/**
 * VULNERABLE - The Next.js App Router idiom. `router.push` accepts an absolute
 * URL, so a `?next=` the user supplied navigates wherever they like.
 */
import { useRouter, useSearchParams } from 'next/navigation';

export default function PostLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  return (
    <button onClick={() => router.push(searchParams.get('next'))}>Continue</button>
  );
}
