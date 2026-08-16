/**
 * VULNERABLE - `wepback` (transposed `bp` -> `pb`) in a destructured named
 * import. A bundler impostor controls the emitted bundle, so the squat reaches
 * production even if the malicious package is later removed from the tree.
 */
import { webpack } from 'wepback';

import config from './webpack.config.js';

export function build() {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) return reject(err);
      if (stats.hasErrors()) return reject(new Error(stats.toString()));
      resolve(stats.toJson({ all: false, assets: true }));
    });
  });
}
