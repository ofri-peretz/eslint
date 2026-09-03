/**
 * VULNERABLE - Google Analytics configured at module load. By the time the
 * banner renders, the hit has already gone out.
 */
gtag('config', 'G-ACME00000');
