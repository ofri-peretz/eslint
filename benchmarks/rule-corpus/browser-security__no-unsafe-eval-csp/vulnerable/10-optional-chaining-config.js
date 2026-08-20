/** VULNERABLE - a runtime config read through optional chaining, with the
 *  permissive policy as the fallback that ships whenever the config is absent
 *  — i.e. in every environment nobody remembered to configure. */
const runtime = globalThis.__APP_CONFIG__;

export const policy =
  runtime?.security?.csp ?? "default-src 'self'; script-src 'unsafe-eval'";
