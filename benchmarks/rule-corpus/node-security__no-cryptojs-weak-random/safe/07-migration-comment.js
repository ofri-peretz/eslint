/**
 * SAFE - the migration landed. CryptoJS.lib.WordArray.random appears only in
 * the comment and in the changelog string that records its removal.
 */
import { randomBytes } from 'node:crypto';

// Was: CryptoJS.lib.WordArray.random(16) — CVE-2020-36732, replaced 2026-03-02.
export const CHANGELOG = 'replaced CryptoJS.lib.WordArray.random with randomBytes';

export const salt = () => randomBytes(16);
