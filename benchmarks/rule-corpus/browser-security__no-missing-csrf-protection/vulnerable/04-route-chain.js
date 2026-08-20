/** VULNERABLE - `router.route(path).post(handler)`: the path is spent by
 *  `.route()`, so the handler list starts at argument zero. */
const express = require('express');
const router = express.Router();

router.route('/invoices').get(listInvoices).post(createInvoice);

module.exports = router;
