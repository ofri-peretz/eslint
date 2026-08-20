/**
 * VULNERABLE - A plugin loader that evaluates whatever the config endpoint returned.
 */
export async function loadPlugins() {
  const response = await fetch('/api/plugins.json');
  const manifest = await response.json();
  for (const plugin of manifest.plugins) {
    eval(plugin.bootstrap);
  }
}
