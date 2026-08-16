/**
 * VULNERABLE - an Express admin endpoint dumps the live session table, which
 * holds every signed-in user's session id, to a hard-coded name in the shared
 * temp directory. /tmp is world-writable and world-readable on a default Linux
 * box, so the dump is disclosed to every local account and the name is
 * pre-creatable by an attacker.
 */
const fs = require('fs');
const express = require('express');

const router = express.Router();

router.post('/admin/sessions/export', async (req, res) => {
  const sessions = await req.app.locals.store.all();
  fs.writeFileSync('/tmp/session-dump.json', JSON.stringify(sessions), 'utf8');
  res.json({ ok: true, path: '/tmp/session-dump.json' });
});

module.exports = router;
