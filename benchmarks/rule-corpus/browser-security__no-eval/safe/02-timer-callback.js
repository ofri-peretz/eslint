/**
 * SAFE - The correct remediation for the string-body timer: pass a function.
 */
export function scheduleRefresh(widgetId) {
  setTimeout(() => refreshWidget(widgetId), 2000);
  setInterval(pollStatus, 5000);
}
