/**
 * VULNERABLE (wave 2) - The METHOD name arrives through a binding, not a
 * literal. Reading only `Literal` property nodes loses the sink.
 */
const WRITE = 'setItem';
localStorage[WRITE]('access_token', token);
