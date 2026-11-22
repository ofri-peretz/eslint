// Planted issues. Every one is deliberate; the harness counts what flags them.
import { useEffect, useRef } from 'react';

export function App({ token }: { token: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // PLANT browser: URL fragment written into the DOM as HTML.
    if (box.current) box.current.innerHTML = window.location.hash.slice(1);

    // PLANT browser: bearer token kept in localStorage.
    localStorage.setItem('authToken', token);

    // PLANT browser: postMessage to any origin.
    window.parent.postMessage({ token }, '*');

    // PLANT browser: message handler that never checks event.origin.
    window.addEventListener('message', (event) => {
      if (box.current) box.current.innerHTML = String(event.data);
    });
  }, [token]);

  return <div ref={box} />;
}
