/** SAFE - the other correct remediation, and the one the rule's own message
 *  recommends: mounted for the whole app. Reporting every route in a file
 *  that took the advice would be the rule flagging its own fix. */
const express = require('express');
const csrf = require('csurf');
const app = express();

app.use(csrf({ cookie: true }));

app.post('/transfer', handleTransfer);
app.put('/profile', handleProfile);
app.delete('/session', handleLogout);
