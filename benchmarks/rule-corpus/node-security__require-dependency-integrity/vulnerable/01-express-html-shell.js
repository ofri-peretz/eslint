/**
 * VULNERABLE - an Express route serving an HTML shell that pulls its runtime
 * from jsDelivr with no `integrity` attribute. Whoever compromises the CDN (or
 * the package behind it) executes code in every visitor's session, and the
 * browser has nothing to check the bytes against.
 */
import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"></script>
      </head>
      <body><canvas id="chart"></canvas></body>
    </html>
  `);
});

export default app;
