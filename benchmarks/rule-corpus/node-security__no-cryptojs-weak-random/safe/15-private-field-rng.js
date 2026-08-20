/**
 * ADVERSARIAL SAFE - the generator held in a private class field, so the member
 * chain contains a PrivateIdentifier that names no module export. The RNG is
 * injected and seeded for reproducible fixtures.
 */
export class FixtureFactory {
  #rng;

  constructor(rng) {
    this.#rng = rng;
  }

  id() {
    return this.#rng.random(16);
  }
}
