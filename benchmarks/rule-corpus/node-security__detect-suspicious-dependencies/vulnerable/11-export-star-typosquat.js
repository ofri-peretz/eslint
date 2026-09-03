/**
 * VULNERABLE (adversarial) - `export *` re-exports the whole impostor package
 * under this module's name, so every consumer of this barrel gets the squat
 * without the squat's name ever appearing in their source.
 */
export * from 'wepback';
export * as reactCompat from 'raect';

export const barrelVersion = 3;
