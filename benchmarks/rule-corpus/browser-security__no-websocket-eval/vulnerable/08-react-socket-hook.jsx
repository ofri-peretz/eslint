/**
 * VULNERABLE - The React idiom: a socket opened in an effect, frames executed.
 */
import { useEffect } from 'react';

export function LiveDashboard({ room }) {
  useEffect(() => {
    const ws = new WebSocket(`wss://live.example.test/${room}`);
    ws.onmessage = (event) => {
      eval(event.data);
    };
    return () => ws.close();
  }, [room]);
  return null;
}
