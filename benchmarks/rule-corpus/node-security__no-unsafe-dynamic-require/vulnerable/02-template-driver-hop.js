/**
 * VULNERABLE - one intermediate `const`, then interpolation into a template.
 * `../` sequences walk out of the drivers directory; the extension is not even
 * pinned, so any .js on disk is reachable.
 */
const express = require('express');

const router = express.Router();

router.post('/connect', (req, res, next) => {
  const name = req.body.driver;
  try {
    const driver = require(`./drivers/${name}`);
    res.json(driver.describe());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
