/**
 * VULNERABLE - `v8.deserialize` reconstructs the structured-clone graph without
 * validating it. Feeding it a base64 blob from the request lets an attacker
 * choose the object graph the worker then operates on.
 */
import v8 from 'node:v8';

export function resumeJob(req) {
  const checkpoint = v8.deserialize(Buffer.from(req.body.checkpoint, 'base64'));
  return checkpoint;
}
