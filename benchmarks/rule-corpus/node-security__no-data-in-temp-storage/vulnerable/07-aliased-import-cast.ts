/**
 * VULNERABLE - aliased named import, TypeScript. The alias hides the sink from
 * anything matching on the identifier `fs`, and the `as string` cast hides the
 * payload from anything matching on the argument's shape. The customer export
 * still lands at a fixed path in the shared temp directory.
 */
import { writeFileSync as write } from 'node:fs';

interface ExportJob {
  payload: unknown;
}

const DESTINATION = '/tmp/customer-export.json';

export function runExport(job: ExportJob): string {
  write(DESTINATION, job.payload as string);
  return DESTINATION;
}
