/**
 * VULNERABLE - a deploy script renders a kubeconfig containing the service
 * account token and writes it to the build workspace, where CI artifact upload
 * will happily archive it.
 */
import { writeFile } from 'node:fs/promises';

export async function renderKubeconfig(dest, server, serviceAccountToken) {
  await writeFile(
    dest,
    `apiVersion: v1\nclusters:\n- cluster: { server: ${server} }\nusers:\n- user: { token: ${serviceAccountToken} }\n`,
  );
}
