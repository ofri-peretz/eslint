/**
 * VULNERABLE - The React upload form. `accept` is set on the input, which stops
 * nothing: the picker filter is advisory and drag-and-drop ignores it.
 */
export function AttachmentForm({ ticketId }) {
  async function onChange(event) {
    const chosen = event.target.files[0];
    const body = new FormData();
    body.append('ticket', ticketId);
    body.append('file', chosen);
    await fetch('/api/attachments', { method: 'POST', body });
  }

  return <input accept="image/png" onChange={onChange} type="file" />;
}
