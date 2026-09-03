/**
 * SAFE - An e-commerce catalogue sync for an electronics store. Every value
 * logged is a product attribute or a stock count.
 *
 * Three innocent carriers of `phone` in one file, all of them ordinary English
 * product nouns: `headphonesInStock`, `smartphoneCaseSku`, `saxophoneListings`.
 */
import { fetchCatalog } from '../integrations/shopify.js';

export async function syncCatalog() {
  const inventory = await fetchCatalog();

  console.info('audio accessories', inventory.headphonesInStock);
  console.info('phone accessories', inventory.smartphoneCaseSku);
  console.info('instruments', inventory.saxophoneListings);

  return inventory;
}
