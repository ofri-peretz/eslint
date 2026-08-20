/**
 * VULNERABLE - `new Buffer(n)` with a numeric argument returns UNINITIALIZED
 * heap, and the size here comes off an HTTP request. The response body is
 * whatever the allocator last held at that address.
 */
import express from 'express';

const app = express();

app.post('/upload/reserve', express.json(), (req, res) => {
  const declaredSize = Number(req.body.contentLength);
  const scratch = new Buffer(declaredSize);
  res.setHeader('content-type', 'application/octet-stream');
  res.end(scratch);
});

export default app;
