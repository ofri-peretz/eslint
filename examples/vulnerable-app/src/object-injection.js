// FLAGSHIP: secure-coding/detect-object-injection · CWE-915 / CWE-1321
// Indexing an object with a user-controlled key opens prototype pollution
// and arbitrary-method-invocation vectors (think `obj['__proto__']`, `obj['constructor']`).

const config = {
  defaultTimeout: 5000,
  retries: 3,
};

export function getConfig(req) {
  const key = req.query.key;
  // ❌ Vulnerable: `key` is attacker-controlled. `__proto__`, `constructor`,
  // or `toString` exposes internals; deeper assignments via merge can
  // pollute Object.prototype across the process.
  return config[key];
}

export function setConfig(req) {
  const path = req.query.path;
  const value = req.body.value;
  // ❌ Even worse: writing arbitrary keys allows `__proto__.isAdmin = true` style attacks.
  config[path] = value;
}
