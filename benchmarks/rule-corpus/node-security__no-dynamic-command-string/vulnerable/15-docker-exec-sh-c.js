/**
 * VULNERABLE (adversarial) - the classic container-ops shape: `docker exec`
 * ends in `sh -c <command line>`. The shell doing the re-parsing lives inside
 * the argument vector rather than at argv[0].
 */
const { spawnSync } = require('child_process');

module.exports = function tailLog(container, service) {
  return spawnSync(
    'docker',
    ['exec', '-i', container, 'sh', '-c', `tail -n 100 /var/log/${service}.log`],
    { encoding: 'utf8' },
  );
};
