/**
 * SAFE (adversarial) - every squat name in this file appears only as data: in
 * a comment, in a log message, in an array of names the security team blocks.
 * Nothing is loaded. A report here would prove the rule reads TEXT rather than
 * module specifiers.
 *
 * Blocked names on file: loadsh, raect, expres, axois, wepback.
 */
import express from 'express';

const BLOCKED_PACKAGES = ['loadsh', 'raect', 'expres', 'axois', 'wepback'];

export function auditManifest(manifest, logger) {
  const found = Object.keys(manifest.dependencies ?? {}).filter((name) =>
    BLOCKED_PACKAGES.includes(name),
  );
  if (found.length > 0) {
    logger.error(`refusing to build: known typosquats present (${found.join(', ')})`);
  }
  return { blocked: found, app: express };
}
