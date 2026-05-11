// FLAGSHIP: vercel-ai-security/no-unsafe-output-handling · OWASP LLM02
// LLM output flowing into an unsanitized sink (DOM, shell, eval, SQL) is the
// canonical "Insecure Output Handling" weakness from the OWASP LLM Top 10.

import { generateText } from 'ai';
import { exec } from 'node:child_process';

export async function summarizeAndRender(el, prompt) {
  const result = await generateText({ model: 'gpt-4o', prompt });
  // ❌ Vulnerable: model output goes straight into innerHTML — XSS via prompt-injection.
  el.innerHTML = result.text;
}

export async function llmShellAgent(userTask) {
  const result = await generateText({
    model: 'gpt-4o',
    prompt: `Output a shell command that accomplishes: ${userTask}`,
  });
  // ❌ Vulnerable: model output executed as a shell command — RCE via prompt-injection.
  exec(result.text);
}

// ✅ Safe equivalents: render LLM output via textContent + a strict allowlist;
//    never feed model output to a shell — translate into a typed action plan first.
