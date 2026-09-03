/** VULNERABLE - PATCH is state-changing too, and a JSON content type is not a
 *  defence: a form post with the right enctype reaches it without a preflight. */
const express = require('express');
const app = express();

app.use(express.json());

app.patch('/settings/notifications', (req, res) => {
  saveSettings(req.user.id, req.body);
  res.json({ ok: true });
});
