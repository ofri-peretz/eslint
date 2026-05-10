// OWASP LLM02 — generateText output evaluated as code
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — eval'ing untrusted LLM output is RCE
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function executePlan(prompt: string) {
  const { text } = await generateText({ model: openai('gpt-4'), prompt });
  return eval(text);
}
