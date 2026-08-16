/**
 * VULNERABLE - `expres` (one deleted `s`) reached through `await import()`.
 * Lazy server bootstraps import their framework this way so the CLI can start
 * without paying the framework's load cost; the specifier is still a constant
 * dependency name and still a squat.
 */
export async function startServer(port) {
  const { default: expres } = await import('expres');
  const app = expres();

  app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}
