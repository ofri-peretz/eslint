/**
 * VULNERABLE (adversarial) - execa's array form is the recommended safe API,
 * but the safety comes from NOT invoking a shell. Routing it through
 * `bash -c` puts the whole escape hatch back.
 */
import { execa } from 'execa';

export async function applyMigration(name) {
  await execa('bash', ['-c', `psql -f migrations/${name}.sql`], {
    stdio: 'inherit',
  });
}
