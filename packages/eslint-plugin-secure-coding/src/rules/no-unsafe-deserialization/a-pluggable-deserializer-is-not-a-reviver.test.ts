/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `this.deserializer.deserialize(buffer)` is a class calling its own
 * collaborator, not reviving a payload through a library that executes it.
 *
 * Found by linting nestjs/nest at e0600bb: ten findings across the
 * microservice clients and servers, every one
 *
 *   incomingResponse = await this.deserializer.deserialize(buffer)
 *
 * `deserialize` is on the default sink list by SPELLING, so any method of that
 * name that is handed a function parameter reports. The spelling is shared by
 * every serialization protocol (protobuf, Avro, a framework's pluggable
 * `Deserializer` interface, webpack's `serialization` layer), and what makes a
 * reviver dangerous is what it does with the payload, which the name cannot
 * say. A receiver the class holds or constructs (`this.x`, `new X()`) is a
 * collaborator the project owns and chose; a sink reached through a package is
 * resolved through its import and keeps reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeDeserialization } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-unsafe-deserialization - a pluggable deserializer is not a reviver',
  noUnsafeDeserialization,
  {
    valid: [
      {
        // nest packages/microservices/client/client-tcp.ts:128
        name: 'a client delegating to its own injected deserializer',
        code: `class ClientTCP {
  async handleResponse(buffer) {
    let incomingResponse;
    try {
      incomingResponse = await this.deserializer.deserialize(buffer);
    } catch (error) {
      return;
    }
    return incomingResponse;
  }
}`,
      },
      {
        name: 'a deeper this-rooted chain',
        code: `class Server { handle(packet) { return this.options.codec.deserialize(packet); } }`,
      },
      {
        // nest test/deserializers/*.spec.ts shape
        name: 'an instance the function itself constructed',
        code: `async function run(message) {
  const instance = new KafkaRequestDeserializer();
  return instance.deserialize(message);
}`,
      },
      {
        name: 'a protocol method on an object literal delegating to the next layer',
        code: `export const codec = { deserialize(ctx) { return peer.deserialize(ctx); } };`,
      },
      {
        name: 'a fromJSON arrow bound to a variable delegating to the next layer',
        code: `const fromJSON = (json) => peer.deserialize(json);`,
      },
      {
        name: 'a static deserialize method delegating to the next layer',
        code: `class Mod { static deserialize(ctx) { return peer.deserialize(ctx); } }`,
      },
      {
        name: 'a named deserialize function delegating to the next layer',
        code: `function unserialize(data) { return peer.deserialize(data); }`,
      },
      {
        name: 'a field filled from an injected parameter is the project’s collaborator',
        code: `class A { constructor(codec) { this.other = 1; this.codec = codec; } run(p) { return this.codec.deserialize(p); } }`,
      },
      {
        name: 'a field initialized with an instance of a relative import is owned',
        code: `import { Helper } from './helper';
class A { 'quoted' = 1; label; codec = new Helper(); run(p) { return this.codec.deserialize(p); } }`,
      },
      {
        name: 'an instance of a relative import is owned',
        code: `import { Local } from './local';
export function run(p) { const c = new Local(); return c.deserialize(p); }`,
      },
      {
        name: 'an instance of a class this file declares, with no package in it, is owned',
        code: `class Codec { run(x) { return x; } }
export function run(p) { const c = new Codec(); return c.deserialize(p); }`,
      },
      {
        name: 'a this-rooted receiver outside any class has no field to trace',
        code: `function f(p) { return this.codec.deserialize(p); }`,
      },
      {
        name: 'an instance of a member constructor that resolves to no module',
        code: `export function run(lib, p) { const c = new lib.Codec(); return c.deserialize(p); }`,
      },
      {
        name: 'an instance of an undeclared constructor',
        code: `export function run(p) { const c = new GlobalCodec(); return c.deserialize(p); }`,
      },
      {
        name: 'a private field write is a different field from the one being called',
        code: `import serialize from 'node-serialize';
class A { #package; constructor() { this.#package = serialize; } run(req) { return this.codec.unserialize(req.body.cookie); } }`,
      },
      {
        name: 'a property that happens to be spelled like an import is not the import',
        code: `import serialize from 'node-serialize';
class A { constructor(local) { this.codec = local.serialize; this.other = { serialize: 1 }; } run(req) { return this.codec.unserialize(req.body.cookie); } }`,
      },
    ],
    invalid: [
      {
        name: 'a receiver that is a call result is not a collaborator the class owns',
        code: `export function run(payload) { return getCodec().deserialize(payload); }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a receiver binding declared twice is not provably constructed once',
        code: `export function run(payload) { var codec = new A(); var codec = other; return codec.deserialize(payload); }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a package the file imports keeps reporting through its binding',
        code: `import { unserialize } from 'node-serialize';
export const handler = (req) => unserialize(req.body.cookie);`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a bare receiver the file did not construct still reports on a parameter',
        code: `export function run(payload) { return codec.deserialize(payload); }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a this-rooted receiver is not an excuse for the node-serialize sink on request data',
        code: `import serialize from 'node-serialize';
class H { handle(req) { return serialize.unserialize(req.body.cookie); } }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a receiver reached through a function parameter, not this, still reports',
        code: `export function run(ctx, packet) { return ctx.deserializer.deserialize(packet); }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a field a constructor fills from a package keeps reporting',
        code: `import serialize from 'node-serialize';
class A { constructor() { this.codec = serialize; } run(req) { return this.codec.unserialize(req.body.cookie); } }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a field initializer that is a package keeps reporting',
        code: `import serialize from 'node-serialize';
class A { codec = serialize; run(req) { return this.codec.unserialize(req.body.cookie); } }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a quoted field name is the same field',
        code: `import serialize from 'node-serialize';
class A { 'codec' = serialize; run(req) { return this.codec.unserialize(req.body.cookie); } }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a computed field off this cannot be traced and keeps reporting',
        code: `class A { run(req, k) { return this[k].deserialize(req.body); } }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'an instance of a local class that keeps a package sink in a field',
        code: `import serialize from 'node-serialize';
class Codec { constructor() { this.unserialize = serialize.unserialize; } }
export function run(req) { const c = new Codec(); return c.unserialize(req.body.cookie); }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'an instance of a class imported from a package is not the project’s',
        code: `import { Foo } from 'some-pkg';
export function run(req) { const c = new Foo(); return c.deserialize(req.body); }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a computed field write of a package may fill the field being called',
        code: `import serialize from 'node-serialize';
class A { constructor(k) { this[k] = serialize; } run(req) { return this.codec.unserialize(req.body.cookie); } }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a member write that plants a package sink on a constructed instance',
        code: `import serialize from 'node-serialize';
class Codec {}
export function run(req) { const c = new Codec(); c.unserialize = serialize.unserialize; return c.unserialize(req.body.cookie); }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'a shorthand property DOES read the import',
        code: `import serialize from 'node-serialize';
class A { constructor() { this.codec = { serialize }; } run(req) { return this.codec.unserialize(req.body.cookie); } }`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
    ],
  },
);
