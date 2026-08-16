/**
 * VULNERABLE - The `xpath` package's own README signature, with the predicate
 * value spliced in. `" or "1"="1` in `name` selects every user node; a `]` plus
 * a new step reads any part of the document.
 */
const express = require('express');
const xpath = require('xpath');
const { directory } = require('../lib/directory');

const router = express.Router();

router.get('/staff', (req, res) => {
  const nodes = xpath.select("//staff/member[@name='" + req.query.name + "']", directory());
  res.json(nodes.map((n) => n.textContent));
});

module.exports = router;
