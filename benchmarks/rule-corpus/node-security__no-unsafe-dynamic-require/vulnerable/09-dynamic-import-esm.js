/**
 * VULNERABLE (adversarial) - the ESM spelling of the same defect. `import()`
 * evaluates the module it resolves exactly as `require` does, and in an ESM
 * codebase it is the ONLY spelling available. The rule ships an
 * `allowDynamicImport` option whose default is documented as "false (stricter)",
 * which promises this is reported.
 */
import express from 'express';

const router = express.Router();

router.post('/plugins/:name/activate', async (req, res, next) => {
  try {
    const plugin = await import(req.params.name);
    await plugin.activate();
    res.status(202).end();
  } catch (error) {
    next(error);
  }
});

export default router;
