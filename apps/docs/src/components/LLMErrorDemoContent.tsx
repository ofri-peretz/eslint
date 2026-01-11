'use client';

import { useState, useEffect } from "react";
import { Check, Copy, Info, Terminal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

function TypingEffect({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i === text.length) clearInterval(interval);
      }, 20); // Typing speed
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return <span>{displayedText}</span>;
}

export function LLMErrorDemoContent() {
  const [activeTab, setActiveTab] = useState<"human" | "llm">("llm");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Marketing Header for the Component */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-3">
          <Sparkles className="size-3" />
          <span>AI-Native Architecture</span>
        </div>
        <h3 className="text-2xl font-bold text-fd-foreground mb-2">
          The Language of LLMs
        </h3>
        <p className="text-fd-muted-foreground max-w-xl mx-auto text-sm">
          Standard ESLint errors confuse AI models. We provide structured, token-efficient metadata that turns hallucinations into perfectly fixed code.
        </p>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-fd-border bg-[#1a1b26] shadow-2xl shadow-violet-500/10">
        {/* Window Controls & Tabs */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#16161e] border-b border-[#2f334d]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex bg-[#0f111a] rounded-lg p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("human")}
              className={cn(
                "px-3 py-1 rounded-md transition-all",
                activeTab === "human"
                  ? "bg-[#2f334d] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-400"
              )}
            >
              Standard Output
            </button>
            <button
              onClick={() => setActiveTab("llm")}
              className={cn(
                "px-3 py-1 rounded-md transition-all flex items-center gap-1.5",
                activeTab === "llm"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-400"
              )}
            >
              <Sparkles className="size-3" />
              LLM Optimized
            </button>
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Content Area */}
        <div className="p-6 font-mono text-sm min-h-[220px]">
          <AnimatePresence mode="wait">
            {activeTab === "human" ? (
              <motion.div
                key="human"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-slate-400 mb-2">src/db/users.ts:42:15</div>
                <div className="text-red-400 font-bold mb-1">
                  Error: Possible SQL injection vector
                </div>
                <div className="text-slate-500 pl-4 border-l-2 border-slate-700">
                  const query = &quot;SELECT * FROM users WHERE id = &quot; + input;
                </div>
                <div className="mt-6 p-4 rounded bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs">
                  <div className="flex items-start gap-2">
                    <Info className="size-4 shrink-0 mt-0.5 text-blue-400" />
                    <div>
                      <span className="font-bold text-slate-300">Why this fails AI:</span>
                      <p className="mt-1">
                        Lack of context. Typical LLMs might just try to escape the string instead of using parameterized queries, or hallucinate a library-specific fix without knowing the driver.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="llm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-500 text-xs">src/db/users.ts:42:15</div>
                  <div className="flex gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ff9e64]/20 text-[#ff9e64] border border-[#ff9e64]/30">
                      CWE-89
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#7aa2f7]/20 text-[#7aa2f7] border border-[#7aa2f7]/30">
                      OWASP:A03
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#bb9af7]/20 text-[#bb9af7] border border-[#bb9af7]/30">
                      CVSS:9.8
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-[#f7768e] font-bold">error</span>
                  <span className="text-slate-400 mx-2">|</span>
                  <span className="text-[#e0af68]">SQL Injection via String Concatenation</span>
                  <span className="text-slate-400 mx-2">|</span>
                  <span className="text-[#f7768e] font-bold bg-[#f7768e]/10 px-2 py-0.5 rounded">CRITICAL</span>
                </div>

                <div className="relative group">
                   <div className="absolute -inset-0.5 bg-linear-to-r from-violet-600 to-indigo-600 rounded opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
                   <div className="relative p-3 rounded bg-[#1f2335] border border-violet-500/30 text-emerald-400">
                      <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <Sparkles className="size-3 text-violet-400" />
                        AI Auto-Fix Suggestion
                      </div>
                      <div className="font-mono text-sm">
                        <TypingEffect text='db.query("SELECT * FROM users WHERE id = $1", [input])' delay={300} />
                      </div>
                   </div>
                </div>

                 <div className="mt-4 flex gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-emerald-500" />
                        <span>Token Efficient</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-emerald-500" />
                        <span>Context Aware</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-emerald-500" />
                        <span>Zero Hallucination</span>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
