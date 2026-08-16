/**
 * SAFE - The ternary's TRUE arm. Same gate, expression form.
 */
const send = gdprOptIn ? () => analytics.track('Signup Completed') : () => {};
send();
