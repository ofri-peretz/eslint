/**
 * VULNERABLE - A background-sync worker replaying a queued upload. The queue
 * entry carries the file the page picked; nothing re-checks it here either.
 */
self.addEventListener('sync', (event) => {
  event.waitUntil(
    (async () => {
      const queue = await openQueue();
      for (const entry of await queue.all()) {
        const body = new FormData();
        body.append('file', entry.files[0]);
        await fetch('/api/upload', { method: 'POST', body });
      }
    })(),
  );
});
