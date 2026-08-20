/**
 * VULNERABLE - ADVERSARIAL. Inside a Worker there is no `window`; `self` is the
 * only spelling of the global object available. A rule that matches only the
 * bare identifier is blind to every worker in the codebase.
 */
self.addEventListener('message', async (event) => {
  const res = await self.fetch('http://api.acme-corp.io/v1/jobs/' + event.data.id);
  self.postMessage(await res.json());
});
