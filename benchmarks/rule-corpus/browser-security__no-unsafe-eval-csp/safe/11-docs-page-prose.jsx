/** SAFE - ADVERSARIAL. A documentation page whose body text discusses the
 *  directive. Rendered prose is not a policy; nothing here reaches a header. */
const FAQ = [
  {
    q: "Why did you remove 'unsafe-eval' from our CSP?",
    a: "It re-enables eval() for every script on the page, so the policy stops being a boundary.",
  },
];

export function SecurityFaq() {
  return (
    <dl>
      {FAQ.map(({ q, a }) => (
        <div key={q}>
          <dt>{q}</dt>
          <dd>{a}</dd>
        </div>
      ))}
    </dl>
  );
}
