/**
 * VULNERABLE - The idiomatic React realtime hook, opened on mount.
 */
import { useEffect } from 'react';

export function useLiveFeed(topic) {
  useEffect(() => {
    const socket = new WebSocket('ws://live.acme-corp.io/feed');
    socket.onmessage = (event) => console.log(topic, event.data);
    return () => socket.close();
  }, [topic]);
}
