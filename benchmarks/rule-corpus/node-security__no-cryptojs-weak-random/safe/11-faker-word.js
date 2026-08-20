/**
 * SAFE - a seeded fixture generator. `random` is a namespace here, not a call.
 */
import { faker } from '@faker-js/faker';

export const buildUser = () => ({
  name: faker.person.fullName(),
  slug: faker.random.word(),
});
