/**
 * SAFE for CWE-95 - `require.resolve` performs resolution only; it never loads
 * or executes the module. The route below uses it to answer "is this plugin
 * installed", and the answer is discarded if it is not on the allowlist.
 */
const PLUGINS = new Set(['@scope/plugin-a', '@scope/plugin-b']);

module.exports = function isInstalled(req, res) {
  const name = String(req.query.name);
  if (!PLUGINS.has(name)) {
    res.json({ installed: false });
    return;
  }
  try {
    require.resolve(name);
    res.json({ installed: true });
  } catch {
    res.json({ installed: false });
  }
};
