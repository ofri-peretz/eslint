import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { preventDoubleRelease } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('prevent-double-release', preventDoubleRelease, {
  valid: [
    // ============================================
    // BASIC VALID PATTERNS
    // ============================================
    
    {
      name: 'Single release in basic function',
      code: `
        async function basic() {
          const client = await pool.connect();
          client.release();
        }
      `,
    },
    
    {
      name: 'Single release in finally block - best practice',
      code: `
        async function properTryFinally() {
          const client = await pool.connect();
          try {
            await client.query('SELECT 1');
          } catch (e) {
            throw e;
          } finally {
            client.release();
          }
        }
      `,
    },
    
    // ============================================
    // MUTUALLY EXCLUSIVE BRANCHES (NO FP)
    // ============================================
    
    {
      name: 'If/else branches - mutually exclusive',
      code: `
        async function ifElse() {
          const client = await pool.connect();
          if (condition) {
            client.release();
          } else {
            client.release();
          }
        }
      `,
    },
    
    {
      name: 'If/else-if/else chain - mutually exclusive',
      code: `
        async function ifElseIfElse() {
          const client = await pool.connect();
          if (a) {
            client.release();
          } else if (b) {
            client.release();
          } else {
            client.release();
          }
        }
      `,
    },
    
    {
      name: 'Ternary with release in both branches - mutually exclusive',
      code: `
        async function ternary() {
          const client = await pool.connect();
          condition ? handleA(client) : handleB(client);
          // Only one path releases
        }
      `,
    },
    
    {
      name: 'Switch with return after each release - mutually exclusive',
      code: `
        async function switchWithReturn(type: string) {
          const client = await pool.connect();
          switch(type) {
            case 'a':
              client.release();
              return 'a';
            case 'b':
              client.release();
              return 'b';
            default:
              client.release();
              return 'default';
          }
        }
      `,
    },
    
    // ============================================
    // EARLY RETURN/THROW SEPARATING RELEASES
    // ============================================
    
    {
      name: 'Return separates sequential releases',
      code: `
        async function returnSeparates() {
          const client = await pool.connect();
          client.release();
          return;
          client.release(); // Unreachable
        }
      `,
    },
    
    {
      name: 'Throw separates sequential releases',
      code: `
        async function throwSeparates() {
          const client = await pool.connect();
          client.release();
          throw new Error('done');
          client.release(); // Unreachable
        }
      `,
    },
    
    {
      name: 'Early return with proper finally',
      code: `
        async function earlyReturnThrow(skip: boolean) {
          const client = await pool.connect();
          try {
            if (skip) {
              throw new Error('skip');
            }
            return await client.query('SELECT 1');
          } finally {
            client.release();
          }
        }
      `,
    },
    
    // ============================================
    // GUARDED RELEASE PATTERNS (NO FP)
    // ============================================
    
    {
      name: 'Guarded with !released flag',
      code: `
        async function guardedReleased() {
          const client = await pool.connect();
          let released = false;
          if (!released) { client.release(); released = true; }
          if (!released) { client.release(); released = true; }
        }
      `,
    },
    
    {
      name: 'Guarded with !done flag',
      code: `
        async function guardedDone() {
          const client = await pool.connect();
          let done = false;
          if (!done) { client.release(); done = true; }
          if (!done) { client.release(); done = true; }
        }
      `,
    },
    
    {
      name: 'Guarded with !closed flag',
      code: `
        async function guardedClosed() {
          const client = await pool.connect();
          let closed = false;
          if (!closed) { client.release(); closed = true; }
          if (!closed) { client.release(); closed = true; }
        }
      `,
    },
    
    {
      name: 'Guarded with !client.released member',
      code: `
        async function guardedMember() {
          const client = await pool.connect();
          if (!client.released) { client.release(); }
          if (!client.released) { client.release(); }
        }
      `,
    },
    
    // ============================================
    // DIFFERENT CLIENTS (NO FP)
    // ============================================
    
    {
      name: 'Different clients can both release',
      code: `
        async function differentClients() {
          const client1 = await pool.connect();
          const client2 = await pool.connect();
          client1.release();
          client2.release();
        }
      `,
    },
    
    {
      name: 'Client in separate function scope',
      code: `
        async function outer() {
          const client = await pool.connect();
          client.release();
          
          async function inner() {
            const client = await pool.connect(); // Different scope
            client.release();
          }
        }
      `,
    },
    
    // ============================================
    // COMPLEX CONTROL FLOW - VALID
    // ============================================
    
    {
      name: 'Release inside callback (different function scope)',
      code: `
        async function withCallback() {
          const client = await pool.connect();
          await doSomething(() => {
            client.release(); // In callback
          });
          // No release here
        }
      `,
    },
    
    {
      name: 'Promise.finally with single release',
      code: `
        async function promiseFinally() {
          const client = await pool.connect();
          return somePromise
            .then(result => result)
            .finally(() => client.release());
        }
      `,
    },
    
    // ============================================
    // EDGE CASES - NOT DETECTED (DOCUMENTED FN)
    // ============================================
    
    // These are known limitations documented in the rule
    {
      name: 'Loop pattern - requires CFG (documented FN)',
      code: `
        async function loopRelease() {
          const client = await pool.connect();
          for (let i = 0; i < 1; i++) {
            client.release();
          }
          client.release();
        }
      `,
    },
    
    {
      name: 'While loop with release - requires CFG (documented FN)',
      code: `
        async function whileRelease() {
          const client = await pool.connect();
          while (true) {
            client.release();
            break;
          }
          client.release();
        }
      `,
    },
  ],

  invalid: [
    // ============================================
    // BASIC DOUBLE RELEASE
    // ============================================
    
    {
      name: 'Sequential double release - same block',
      code: `
        async function invalid() {
          const client = await pool.connect();
          client.release();
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Sequential triple release - reports sequential pairs',
      code: `
        async function tripleRelease() {
          const client = await pool.connect();
          client.release();
          client.release();
          client.release();
        }
      `,
      errors: [
        { messageId: 'doubleRelease' }, // 2nd release (after 1st)
        { messageId: 'doubleRelease' }, // 3rd release (after 2nd)
      ],
    },
    
    {
      name: 'Double release after valid if/else',
      code: `
        async function afterIfElse() {
          const client = await pool.connect();
          if (err) {
            client.release();
            return;
          }
          client.release();
          client.release(); // Error - sequential after valid branch
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // DESTRUCTURED RELEASE
    // ============================================
    
    {
      name: 'Destructured release - double call',
      code: `
        async function destructured() {
          const { release } = await pool.connect();
          release();
          release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Destructured release with other props',
      code: `
        async function destructuredMulti() {
          const { query, release } = await pool.connect();
          await query('SELECT 1');
          release();
          release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // TRY/CATCH/FINALLY PATTERNS
    // ============================================
    
    {
      name: 'Catch + Finally - double on error path',
      code: `
        async function catchPlusFinally() {
          const client = await pool.connect();
          try {
            await client.query('SELECT 1');
          } catch (e) {
            client.release();
            throw e;
          } finally {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Try + Finally - double on success path',
      code: `
        async function tryPlusFinally() {
          const client = await pool.connect();
          try {
            client.release();
          } finally {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Finally + After try statement',
      code: `
        async function finallyAndAfter() {
          const client = await pool.connect();
          try {
            await client.query('SELECT 1');
          } finally {
            client.release();
          }
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Nested try with double release in finally blocks',
      code: `
        async function nestedTry() {
          const client = await pool.connect();
          try {
            try {
              await client.query('SELECT 1');
            } finally {
              client.release();
            }
          } finally {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Try + Catch both release',
      code: `
        async function tryCatchBoth() {
          const client = await pool.connect();
          try {
            await client.query('SELECT 1');
            client.release();
          } catch (e) {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // EARLY RETURN WITHOUT EXIT PATTERNS
    // ============================================
    
    {
      name: 'Early release without return + finally',
      code: `
        async function earlyWithoutReturn(skip: boolean) {
          const client = await pool.connect();
          if (skip) {
            client.release();
            // Missing return!
          }
          try {
            return await client.query('SELECT 1');
          } finally {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'If without else, release in both paths',
      code: `
        async function ifWithoutElse() {
          const client = await pool.connect();
          if (condition) {
            client.release();
          }
          client.release(); // Always runs if condition is false
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // MULTIPLE CATCH BLOCKS
    // ============================================
    
    {
      name: 'Catch release + finally release',
      code: `
        async function multiCatch() {
          const client = await pool.connect();
          try {
            doSomething();
          } catch (e) {
            if (e instanceof TypeError) {
              client.release();
              throw e;
            }
          } finally {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // SWITCH FALLTHROUGH
    // ============================================
    
    {
      name: 'Switch fallthrough causes double release',
      code: `
        async function switchFallthrough(type: string) {
          const client = await pool.connect();
          switch(type) {
            case 'a':
              client.release();
              // Missing break - falls through!
            case 'b':
              client.release();
              break;
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // ASYNC/AWAIT PATTERNS
    // ============================================
    
    {
      name: 'Async/await with double release',
      code: `
        async function asyncDouble() {
          const client = await pool.connect();
          await client.query('SELECT 1');
          client.release();
          await client.query('SELECT 2'); // Would fail anyway
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // SPACING/COMMENTS DON'T AFFECT DETECTION
    // ============================================
    
    {
      name: 'Comments between releases still detected',
      code: `
        async function withComments() {
          const client = await pool.connect();
          client.release();
          // This is a comment
          /* Another comment */
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Multiple empty lines between releases',
      code: `
        async function withSpacing() {
          const client = await pool.connect();
          client.release();


          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // CONDITIONAL RELEASE WITHOUT GUARD
    // ============================================
    
    {
      name: 'If condition without guard pattern',
      code: `
        async function conditionalNoGuard() {
          const client = await pool.connect();
          if (shouldRelease) {
            client.release();
          }
          if (alsoRelease) {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // MIXED PATTERNS
    // ============================================
    
    {
      name: 'Try success + finally with code after',
      code: `
        async function mixedPattern() {
          const client = await pool.connect();
          try {
            await client.query('SELECT 1');
            client.release();
          } finally {
            console.log('done');
          }
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    // ============================================
    // ADVANCED EDGE CASES
    // ============================================
    
    {
      name: 'Arrow function with double release',
      code: `
        const handler = async () => {
          const client = await pool.connect();
          client.release();
          client.release();
        };
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'IIFE with double release',
      code: `
        (async function() {
          const client = await pool.connect();
          client.release();
          client.release();
        })();
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Nested if statements - inner without else',
      code: `
        async function nestedIf() {
          const client = await pool.connect();
          if (outer) {
            if (inner) {
              client.release();
            }
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Try with catch and outer release',
      code: `
        async function tryCatchOuter() {
          const client = await pool.connect();
          try {
            doSomething();
          } catch (e) {
            client.release();
          }
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Multiple try blocks - both with release',
      code: `
        async function multipleTry() {
          const client = await pool.connect();
          try {
            client.release();
          } catch (e) {}
          try {
            client.release();
          } catch (e) {}
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Release before and after await',
      code: `
        async function releaseAroundAwait() {
          const client = await pool.connect();
          client.release();
          await someOperation();
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Try block release + catch block release',
      code: `
        async function tryCatchBothRelease() {
          const client = await pool.connect();
          try {
            client.release();
          } catch (e) {
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Deeply nested function with double release',
      code: `
        async function outer() {
          async function middle() {
            async function inner() {
              const client = await pool.connect();
              client.release();
              client.release();
            }
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Object method pattern',
      code: `
        const service = {
          async query() {
            const client = await pool.connect();
            client.release();
            client.release();
          }
        };
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Class method pattern',
      code: `
        class DbService {
          async query() {
            const client = await pool.connect();
            client.release();
            client.release();
          }
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'If then non-release statement then release',
      code: `
        async function ifThenRelease() {
          const client = await pool.connect();
          if (condition) {
            client.release();
          }
          doSomethingElse();
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Ternary expression followed by release',
      code: `
        async function ternaryThenRelease() {
          const client = await pool.connect();
          condition ? client.release() : null;
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
    
    {
      name: 'Short-circuit OR followed by release',
      code: `
        async function shortCircuitOr() {
          const client = await pool.connect();
          shouldRelease && client.release();
          client.release();
        }
      `,
      errors: [{ messageId: 'doubleRelease' }],
    },
  ],
});
