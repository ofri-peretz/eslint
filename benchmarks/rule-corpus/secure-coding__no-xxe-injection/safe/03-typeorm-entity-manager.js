/**
 * SAFE - NOMINAL CONTROL. Nothing here is XML. This is a TypeORM repository:
 * `EntityManager`, `entityManager`, `entities` and `resolveEntities` are the
 * ORM's own vocabulary, and `entity` is a substring of every one of them. A
 * rule that decides CWE-611 from a spelling reports all of it.
 */
import { EntityManager } from 'typeorm';

export class SubscriptionRepository {
  constructor(entityManager) {
    this.entityManager = entityManager;
  }

  async resolveEntities(customerId) {
    const entities = await this.entityManager.find(EntityManager, { where: { customerId } });
    return entities;
  }
}
