// OWASP LLM02 — safe, textContent escapes HTML
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — textContent treats input as plain text
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function render(prompt: string, target: HTMLElement) {
  const { text } = await generateText({ model: openai('gpt-4'), prompt });
  target.textContent = text;
}
