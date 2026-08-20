/**
 * SAFE - allowlist dispatch. The request only picks WHICH entry runs; both the
 * binary and its argument vector are fixed in the table.
 */
const { spawn } = require('node:child_process');

const TASKS = {
  lint: { bin: 'eslint', args: ['.', '--max-warnings=0'] },
  test: { bin: 'vitest', args: ['run'] },
};

module.exports = function runTask(req, res) {
  const task = TASKS[req.body.task];
  if (!task) {
    res.status(400).json({ error: 'unknown task' });
    return;
  }
  spawn(task.bin, task.args, { stdio: 'inherit' }).on('close', (code) =>
    res.json({ code }),
  );
};
