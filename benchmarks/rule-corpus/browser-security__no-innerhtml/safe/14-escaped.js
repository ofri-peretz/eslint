/**
 * SAFE - Entity-escaped before reaching the sink.
 */
import escapeHtml from 'escape-html';
el.innerHTML = '<b>' + escapeHtml(user.name) + '</b>';
