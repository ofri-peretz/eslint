/**
 * VULNERABLE - `reactt` (doubled trailing character) imported with aliased
 * named bindings. The alias hides the package name from every reader who only
 * scans the identifiers in the body of the file.
 */
import { useState as useLocalState, useEffect as useMount } from 'reactt';

export function useServerTime(endpoint) {
  const [now, setNow] = useLocalState(null);

  useMount(() => {
    let cancelled = false;
    fetch(endpoint)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setNow(body.now);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return now;
}
