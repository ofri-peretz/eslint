/**
 * ADVERSARIAL SAFE - two packages whose names START with a listed one but are
 * different packages. Membership is exact; a prefix test would report both.
 */
import { parse } from 'node-forge-parser-shim';
import md5File from 'md5-file-stream';

export const inspect = (pem) => parse(pem);
export const checksum = (path) => md5File(path);
