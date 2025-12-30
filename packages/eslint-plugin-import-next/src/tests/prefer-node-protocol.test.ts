/**
 * Tests for prefer-node-protocol rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferNodeProtocol } from '../rules/prefer-node-protocol';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run('prefer-node-protocol', preferNodeProtocol, {
  valid: [
    // Already using node: protocol
    { code: `import fs from 'node:fs';` },
    { code: `import path from 'node:path';` },
    { code: `import { readFile } from 'node:fs';` },
    { code: `import { join } from 'node:path';` },
    { code: `import crypto from 'node:crypto';` },
    { code: `import http from 'node:http';` },
    { code: `import https from 'node:https';` },
    { code: `import os from 'node:os';` },
    { code: `import url from 'node:url';` },
    { code: `import util from 'node:util';` },
    { code: `import stream from 'node:stream';` },
    { code: `import events from 'node:events';` },
    { code: `import buffer from 'node:buffer';` },
    { code: `import child_process from 'node:child_process';` },
    
    // Non-Node.js modules
    { code: `import express from 'express';` },
    { code: `import lodash from 'lodash';` },
    { code: `import React from 'react';` },
    
    // Relative imports
    { code: `import foo from './foo';` },
    { code: `import bar from '../bar';` },
    
    // Scoped packages
    { code: `import pkg from '@scope/package';` },
    
    // Sub-paths with node: protocol
    { code: `import { promises } from 'node:fs/promises';` },
    { code: `import { posix } from 'node:path/posix';` },
  ],
  
  invalid: [
    // Common Node.js modules
    {
      code: `import fs from 'fs';`,
      output: `import fs from "node:fs";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import path from 'path';`,
      output: `import path from "node:path";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import crypto from 'crypto';`,
      output: `import crypto from "node:crypto";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import http from 'http';`,
      output: `import http from "node:http";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import https from 'https';`,
      output: `import https from "node:https";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import os from 'os';`,
      output: `import os from "node:os";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import url from 'url';`,
      output: `import url from "node:url";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import util from 'util';`,
      output: `import util from "node:util";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import stream from 'stream';`,
      output: `import stream from "node:stream";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import events from 'events';`,
      output: `import events from "node:events";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import buffer from 'buffer';`,
      output: `import buffer from "node:buffer";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import child_process from 'child_process';`,
      output: `import child_process from "node:child_process";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    
    // Named imports
    {
      code: `import { readFile } from 'fs';`,
      output: `import { readFile } from "node:fs";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import { join, resolve } from 'path';`,
      output: `import { join, resolve } from "node:path";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    
    // Sub-path imports
    {
      code: `import { promises } from 'fs/promises';`,
      output: `import { promises } from "node:fs/promises";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import { posix } from 'path/posix';`,
      output: `import { posix } from "node:path/posix";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    
    // More Node.js modules
    {
      code: `import net from 'net';`,
      output: `import net from "node:net";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import dns from 'dns';`,
      output: `import dns from "node:dns";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import zlib from 'zlib';`,
      output: `import zlib from "node:zlib";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import vm from 'vm';`,
      output: `import vm from "node:vm";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import tty from 'tty';`,
      output: `import tty from "node:tty";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import tls from 'tls';`,
      output: `import tls from "node:tls";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import dgram from 'dgram';`,
      output: `import dgram from "node:dgram";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import readline from 'readline';`,
      output: `import readline from "node:readline";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import cluster from 'cluster';`,
      output: `import cluster from "node:cluster";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import assert from 'assert';`,
      output: `import assert from "node:assert";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `import querystring from 'querystring';`,
      output: `import querystring from "node:querystring";`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
  ],
});

// Test require() calls
ruleTester.run('prefer-node-protocol - require', preferNodeProtocol, {
  valid: [
    { code: `const fs = require('node:fs');` },
    { code: `const path = require('node:path');` },
    { code: `const express = require('express');` },
  ],
  
  invalid: [
    {
      code: `const fs = require('fs');`,
      output: `const fs = require("node:fs");`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `const path = require('path');`,
      output: `const path = require("node:path");`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `const crypto = require('crypto');`,
      output: `const crypto = require("node:crypto");`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
  ],
});

// Test dynamic imports
ruleTester.run('prefer-node-protocol - dynamic import', preferNodeProtocol, {
  valid: [
    { code: `const fs = await import('node:fs');` },
    { code: `const path = await import('node:path');` },
  ],
  
  invalid: [
    {
      code: `const fs = await import('fs');`,
      output: `const fs = await import("node:fs");`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
    {
      code: `const path = await import('path');`,
      output: `const path = await import("node:path");`,
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
  ],
});

// Test additionalModules option
ruleTester.run('prefer-node-protocol - additionalModules', preferNodeProtocol, {
  valid: [
    {
      code: `import custom from 'node:custom';`,
      options: [{ additionalModules: ['custom'] }],
    },
  ],
  
  invalid: [
    {
      code: `import custom from 'custom';`,
      output: `import custom from "node:custom";`,
      options: [{ additionalModules: ['custom'] }],
      errors: [{ messageId: 'preferNodeProtocol' }],
    },
  ],
});
