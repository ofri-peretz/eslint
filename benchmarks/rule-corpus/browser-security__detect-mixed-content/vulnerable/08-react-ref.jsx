/**
 * VULNERABLE - Reached through a React ref, which is the normal way a component
 * touches the DOM. The receiver is `.current`, not an element-shaped name.
 */
import { useEffect, useRef } from 'react';

export function Player({ streamId }) {
  const frame = useRef(null);
  useEffect(() => {
    frame.current.src = `http://stream.acme-corp.io/${streamId}`;
  }, [streamId]);
  return <iframe ref={frame} title="player" />;
}
