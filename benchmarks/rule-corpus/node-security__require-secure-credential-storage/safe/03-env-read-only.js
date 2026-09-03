/**
 * SAFE - reading process.env is how every Node application is configured.
 * Nothing is written to the environment; the value stays in a local.
 */
function createClient(fetchImpl) {
  const token = process.env.SERVICE_API_TOKEN;
  if (!token) throw new Error('SERVICE_API_TOKEN is required');
  return {
    get: (path) => fetchImpl(path, { headers: { authorization: `Bearer ${token}` } }),
  };
}

module.exports = { createClient };
