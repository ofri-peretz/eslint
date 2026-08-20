/**
 * SAFE (adversarial) - `NodeVM` here is the project's own facade over a
 * worker-process isolate, not vm2. The require specifier is the evidence, and
 * it says './isolate'. Deciding by the constructor's NAME reports this.
 */
const { NodeVM } = require('./isolate');

const sandbox = new NodeVM({ timeoutMs: 500 });

module.exports = async function evaluate(req, res) {
  const output = await sandbox.run(req.body.script);
  res.json({ output });
};
