/** VULNERABLE - the page frames a third-party origin. Whatever that origin
 *  serves is composited into this app's UI, and the user cannot tell the two
 *  apart. */
export function Widget() {
  return (
    <div className="panel">
      <iframe src="https://widgets.partner-cdn.example/embed?theme=dark" title="Partner widget" />
    </div>
  );
}
