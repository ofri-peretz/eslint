// OWASP LLM02 — safe, output passed through sanitizer
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — DOMPurify strips active content before insertion
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import DOMPurify from 'dompurify';

async function render(prompt: string, target: HTMLElement) {
  const { text } = await generateText({ model: openai('gpt-4'), prompt });
  target.innerHTML = DOMPurify.sanitize(text);
}
