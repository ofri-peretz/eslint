/**
 * SAFE - The correct remediation: parse the payload as data, never as code.
 */
export async function loadPlugins() {
  const response = await fetch('/api/plugins.json');
  const manifest = JSON.parse(await response.text());
  return manifest.plugins.map((plugin) => plugin.name);
}
