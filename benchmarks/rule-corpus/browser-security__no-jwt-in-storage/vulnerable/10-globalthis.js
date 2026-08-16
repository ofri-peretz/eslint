/**
 * VULNERABLE - `globalThis` is the standard spelling of the global object and
 * denotes exactly the same storage area.
 */
globalThis.localStorage.setItem('token', await mintToken());
