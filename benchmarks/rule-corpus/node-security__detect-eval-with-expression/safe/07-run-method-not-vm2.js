/**
 * SAFE - a `.run()` method on something that is not a vm2 sandbox. The name
 * `run` is the single most common method name in Node tooling; only a receiver
 * proven to be a vm2 VM/NodeVM makes it a code sink.
 */
const { Queue } = require('./task-queue');

const queue = new Queue({ concurrency: 4 });

module.exports = async function enqueue(req, res) {
  const output = await queue.run(req.body.task);
  res.json({ output });
};
