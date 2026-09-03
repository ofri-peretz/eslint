/**
 * VULNERABLE - An offline-first app creating a store for credentials.
 */
import { useEffect } from 'react';

export function OfflineVault() {
  useEffect(() => {
    const request = indexedDB.open('app', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('passwords', { keyPath: 'id' });
    };
  }, []);

  return <p>Offline ready.</p>;
}
