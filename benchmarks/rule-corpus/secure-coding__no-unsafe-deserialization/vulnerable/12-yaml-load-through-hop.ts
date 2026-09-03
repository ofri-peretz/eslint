/**
 * VULNERABLE (adversarial) - The sink reached through a member alias of the
 * module namespace, with the payload behind two string methods. Neither hop
 * removes a YAML tag.
 */
import * as jsYaml from 'js-yaml';
import type { Request } from 'express';

export function ingest(req: Request): unknown {
  return jsYaml.load(String(req.body.document).trim());
}
