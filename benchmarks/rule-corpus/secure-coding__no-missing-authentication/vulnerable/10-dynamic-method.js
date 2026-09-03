/**
 * VULNERABLE (adversarial wave) - Bulk registration through a computed member.
 * Every verb on the admin bulk endpoint is registered without authentication;
 * the method name is a loop variable, so the property is not an Identifier.
 */
import express from 'express';

import { bulkAdminOperation } from '../services/bulk.js';

export const app = express();

for (const method of ['get', 'post', 'delete']) {
  app[method]('/admin/bulk', async (req, res) => {
    res.json(await bulkAdminOperation(method, req.body));
  });
}
