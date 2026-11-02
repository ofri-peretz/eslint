// Model of eslint-plugin-node-security/lock-file (CWE-829).
// Contract (docs): reported when the lock file required by packageManager is
// absent between the linted file's directory and the repository root (.git):
// any = package-lock.json | yarn.lock | pnpm-lock.yaml; npm = package-lock.json;
// yarn = yarn.lock; pnpm = pnpm-lock.yaml.
// Filesystem fact of this harness: src/app.ts is resolved under the eslint repo
// root, which holds .git and package-lock.json only (no yarn.lock, no
// pnpm-lock.yaml). That fact is a model constant, not a sampled input.
module lock_file {
  type PM = AnyPM | Npm | Yarn | Pnpm

  pure val HAS_NPM_LOCK = true
  pure val HAS_YARN_LOCK = false
  pure val HAS_PNPM_LOCK = false

  pure def reports(pm: PM): bool = match pm {
    | AnyPM => not(HAS_NPM_LOCK or HAS_YARN_LOCK or HAS_PNPM_LOCK)
    | Npm => not(HAS_NPM_LOCK)
    | Yarn => not(HAS_YARN_LOCK)
    | Pnpm => not(HAS_PNPM_LOCK)
  }

  var pm: PM
  var verdict: bool

  action step = {
    nondet p = Set(AnyPM, Npm, Yarn, Pnpm).oneOf()
    all { pm' = p, verdict' = reports(p) }
  }

  action init = step
}
