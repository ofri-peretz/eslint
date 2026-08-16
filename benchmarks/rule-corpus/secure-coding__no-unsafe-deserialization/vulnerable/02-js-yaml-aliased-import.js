/**
 * VULNERABLE - Same js-yaml sink, one rename away. Half the ecosystem spells the
 * default import `jsyaml` (that is the UMD global the package ships), and the
 * manifest body is attacker-supplied. Nothing about the LOCAL NAME changes what
 * `load` does; a rule that needs the binding to be spelled `yaml` is detecting a
 * word, not an interface.
 */
const express = require('express');
const jsyaml = require('js-yaml');

const router = express.Router();

router.post('/manifests', (req, res) => {
  const manifest = jsyaml.load(req.body.manifest);
  res.json({ kind: manifest.kind });
});

module.exports = router;
