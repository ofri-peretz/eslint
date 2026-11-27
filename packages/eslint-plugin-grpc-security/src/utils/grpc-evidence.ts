/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview The one place this plugin decides "does this file touch gRPC
 * server reflection?". `addToServer` is an ordinary method name, so every rule
 * abstains unless one of the reflection packages is loaded in the file.
 */
import { createModuleEvidence } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

/** `new ReflectionService(def).addToServer(server)`, maintained by the grpc-node team. */
export const GRPC_REFLECTION = '@grpc/reflection';
/** `addReflection(server, descriptorSetPath)`, the older community package. */
export const GRPC_SERVER_REFLECTION = 'grpc-server-reflection';

export const fileUsesGrpcReflection: (ast: TSESTree.Program) => boolean =
  createModuleEvidence({
    packages: [GRPC_REFLECTION, GRPC_SERVER_REFLECTION],
  });
