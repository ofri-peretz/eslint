// OWASP LLM02 — generateText output flowed into innerHTML
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — LLM outputs are untrusted; injecting via innerHTML is XSS
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function render(prompt: string, target: HTMLElement) {
  const { text } = await generateText({ model: openai('gpt-4'), prompt });
  target.innerHTML = text;
}
