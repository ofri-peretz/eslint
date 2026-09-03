/**
 * SAFE - The React form done properly: the allowlist is checked in the handler,
 * not left to the input's advisory `accept` attribute.
 */
const ALLOWED = ['image/png', 'image/jpeg'];

export function AttachmentForm({ ticketId }) {
  async function onChange(event) {
    const chosen = event.target.files[0];
    if (!ALLOWED.some((allowed) => allowed === chosen.type)) return;
    const body = new FormData();
    body.append('ticket', ticketId);
    body.append('file', chosen);
    await fetch('/api/attachments', { method: 'POST', body });
  }

  return <input accept="image/png" onChange={onChange} type="file" />;
}
