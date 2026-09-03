/**
 * VULNERABLE - A React component embedding basic-auth credentials in an image
 * URL. The browser sends them on every render.
 */
export function StatusBadge() {
  return <img src="https://badge:hunter2@ci.acme-corp.io/badge.svg" alt="build status" />;
}
