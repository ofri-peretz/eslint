/**
 * VULNERABLE - The https URL an app upgrades from, credentials and all.
 */
const streams = { live: 'https://feed:tok3n-secret@events.acme-corp.io/stream' };
subscribe(streams.live);
