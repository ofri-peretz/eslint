/** VULNERABLE - `origin: true` REFLECTS the request's Origin header, which is
 *  strictly worse than '*': browsers refuse to send credentials to a literal
 *  wildcard but will send them to a reflected origin. Paired with
 *  credentials, this is a total same-origin-policy bypass. */
const cors = require('cors');

app.use(cors({ origin: true, credentials: true }));
