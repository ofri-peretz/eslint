/** VULNERABLE - ADVERSARIAL. The framed origin reached by index out of an
 *  environment table. */
const EMBEDS = [
  'https://embed.staging-partner.example/w',
  'https://embed.partner.example/w',
];

export function Embed() {
  return <iframe src={EMBEDS[1]} title="Partner" />;
}
