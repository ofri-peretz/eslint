/**
 * VULNERABLE - A timer given a STRING body is an eval on a delay, and the
 * concatenated spelling is what an injection actually looks like.
 */
export function scheduleRefresh(widgetId) {
  setTimeout('refreshWidget(' + widgetId + ')', 2000);
}
