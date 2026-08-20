/** SAFE - GET is not state-changing, so there is nothing for a forged request
 *  to change. */
const express = require('express');
const app = express();

app.get('/api/orders', (req, res) => {
  res.json({ orders: listOrders(req.user.id) });
});
