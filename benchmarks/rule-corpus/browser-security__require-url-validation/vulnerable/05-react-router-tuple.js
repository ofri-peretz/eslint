/**
 * VULNERABLE - React Router hands the query string back as a TUPLE. Position 0
 * is the params object; the deep link is read straight out of it.
 */
import { useSearchParams } from 'react-router-dom';

export function useOpenTarget() {
  const [params] = useSearchParams();
  return () => window.open(params.get('target'));
}
