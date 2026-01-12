'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare,
  Code2,
  ArrowRight,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BorderBeam } from './ui/border-beam';

interface Step {
  id: number;
  title: string;
  subtitle: string;
}

const steps: Step[] = [
  { id: 1, title: 'Detect', subtitle: 'ESLint catches the vulnerability' },
  { id: 2, title: 'Understand', subtitle: 'AI reads structured metadata' },
  { id: 3, title: 'Fix', subtitle: 'Accurate remediation applied' },
];

interface LLMWorkflowDemoContentProps {
  activeStep: number;
  setActiveStep: (step: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
}

export function LLMWorkflowDemoContent({
  activeStep,
  setActiveStep,
  isPlaying,
  setIsPlaying,
  isHovered,
  setIsHovered
}: LLMWorkflowDemoContentProps) {
  /**
   * Accessibility Note:
   * These changes satisfy the 7:1 (AAA) or 5:1 contrast requirement for mobile light theme 
   * user interfaces while preserving the "cinematic" aesthetic in dark mode.
   */

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Marketing Header */}
      <div className="text-center mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4"
        >
          <Sparkles className="size-4 animate-pulse" />
          <span>Cinematic Showcase</span>
        </motion.div>
        <h2 className="text-4xl md:text-6xl font-black text-fd-foreground mb-6 tracking-tight">
          From Vulnerability to{' '}
          <span className="bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Verified Fix
          </span>
        </h2>
        <p className="text-fd-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
          Watch ESLint Interlace provide the structured ground truth that enables 
          AI Agents to solve security vulnerabilities with 100% precision.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <motion.button
              layout
              onClick={() => setActiveStep(step.id)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-500 group',
                activeStep === step.id
                  ? 'bg-fd-card border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : 'hover:bg-fd-card/50 border border-transparent'
              )}
            >
              {activeStep === step.id && (
                <BorderBeam size={100} duration={4} colorFrom="#10b981" colorTo="#3b82f6" />
              )}
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-500',
                  activeStep === step.id
                    ? 'bg-emerald-700 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 rotate-0'
                    : activeStep > step.id
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-fd-muted text-fd-muted-foreground group-hover:bg-fd-muted/80'
                )}
              >
                {activeStep > step.id ? <CheckCircle2 className="size-5" /> : step.id}
              </div>
              <div className="text-left hidden sm:block">
                <div className={cn(
                  'text-sm font-bold tracking-tight',
                  activeStep === step.id ? 'text-fd-foreground' : 'text-fd-muted-foreground'
                )}>
                  {step.title}
                </div>
                <div className="text-[10px] text-fd-muted-foreground uppercase font-semibold tracking-widest">{step.subtitle}</div>
              </div>
            </motion.button>
            {index < steps.length - 1 && (
              <div className="w-8 h-px bg-linear-to-r from-fd-border via-fd-border/50 to-transparent hidden md:block mx-1" />
            )}
          </React.Fragment>
        ))}
        
        {/* Play/Pause Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsPlaying(!isPlaying)}
          className="ml-6 p-3 rounded-2xl bg-fd-card border border-fd-border hover:border-emerald-500/30 transition-all hover:scale-105"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="size-5 text-emerald-600 dark:text-emerald-500" /> : <Play className="size-5 text-emerald-600 dark:text-emerald-500 fill-emerald-600 dark:fill-emerald-500" />}
        </motion.button>
      </div>

      {/* Demo Container */}
      <div 
        className="relative rounded-3xl overflow-hidden border border-fd-border bg-[#0d1117] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 bg-linear-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Window Controls */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#161b22] border-b border-[#30363d] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="group flex gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#ff5f56] border border-black/10" />
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#ffbd2e] border border-black/10" />
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#27c93f] border border-black/10" />
            </div>
            <div className="ml-2 md:ml-4 px-2 py-0.5 rounded-md bg-[#21262d] border border-[#30363d] flex items-center gap-1.5 md:gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] md:text-[10px] text-[#8b949e] font-mono font-bold tracking-widest uppercase hidden sm:inline">Live Security Context</span>
              <span className="text-[8px] text-[#8b949e] font-mono font-bold tracking-widest uppercase sm:hidden">LIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[#8b949e] font-mono shrink-0">
            <Code2 className="size-3 md:size-4" />
            <span className="opacity-80 hidden sm:inline">src/api/users.ts</span>
            <span className="opacity-80 sm:hidden">users.ts</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[450px] md:min-h-[500px] relative">
          <AnimatePresence mode="wait">
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="p-8"
              >
                {/* Code Editor with Error */}
                <div className="font-mono text-xs md:text-sm space-y-2 overflow-x-auto">
                  <div className="flex items-center gap-4 text-[#8b949e]">
                    <span className="text-[#6e7681] select-none w-8 text-right opacity-40">18</span>
                    <span className="text-[#ff7b72]">async function</span>
                    <span className="text-[#d2a8ff]">getUserById</span>
                    <span className="text-[#c9d1d9]">(userId: </span>
                    <span className="text-[#ff7b72]">string</span>
                    <span className="text-[#c9d1d9]">) {'{'}</span>
                  </div>
                  
                  {/* Error Line */}
                  <motion.div 
                    initial={{ backgroundColor: "rgba(248, 81, 73, 0)" }}
                    animate={{ backgroundColor: "rgba(248, 81, 73, 0.05)" }}
                    transition={{ delay: 0.5 }}
                    className="relative group py-1 rounded-sm"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-500/50" />
                    <div className="flex items-center gap-4 relative">
                      <span className="text-[#6e7681] select-none w-8 text-right opacity-40">19</span>
                      <span className="text-[#c9d1d9]">  </span>
                      <span className="text-[#ff7b72]">const</span>
                      <span className="text-[#c9d1d9]"> query = </span>
                      <span className="text-[#a5d6ff] underline underline-offset-4 decoration-wavy decoration-red-500/50">&quot;SELECT * FROM users WHERE id = &quot;</span>
                      <span className="text-[#c9d1d9]"> + userId;</span>
                    </div>
                  </motion.div>

                  <div className="flex items-center gap-4 text-[#8b949e]">
                    <span className="text-[#6e7681] select-none w-8 text-right opacity-40">20</span>
                    <span className="text-[#c9d1d9]">  </span>
                    <span className="text-[#ff7b72]">return</span>
                    <span className="text-[#c9d1d9]"> db.query(query);</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[#8b949e]">
                    <span className="text-[#6e7681] select-none w-8 text-right opacity-40">21</span>
                    <span className="text-[#c9d1d9]">{'}'}</span>
                  </div>
                </div>

                {/* ESLint Error Popup */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring", damping: 20 }}
                  className="mt-12 p-6 rounded-2xl bg-[#0d1117] border border-red-500/30 shadow-2xl relative overflow-hidden group/popup"
                >
                  <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent pointer-events-none" />
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="size-6 text-red-500 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 tracking-tight">
                          CWE-89
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-tight">
                          OWASP:A03
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 tracking-tight">
                          CVSS:9.8 (CRITICAL)
                        </span>
                      </div>
                      <p className="text-red-400 font-bold text-lg mb-1 tracking-tight">
                        SQL Injection via String Concatenation
                      </p>
                      <p className="text-[#8b949e] text-sm leading-relaxed max-w-lg mb-4">
                        Untrusted input from <code className="text-[#ff9e64]">userId</code> is concatenated into a SQL query. This allows an attacker to manipulate the query logic.
                      </p>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-emerald-400 text-xs font-bold whitespace-nowrap">FIX SUGGESTION</span>
                        <code className="text-[#c9d1d9] text-[10px] truncate">db.query(&apos;SELECT * FROM users WHERE id = $1&apos;, [userId])</code>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="p-8"
              >
                {/* VS Code Copilot-style Chat */}
                <div className="space-y-6 max-w-3xl mx-auto">
                  {/* User Message */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-indigo-500/20 shrink-0">
                      U
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-[#21262d] border border-[#30363d] shadow-sm">
                      <p className="text-[#c9d1d9] text-sm font-medium">How do I fix this security vulnerability? Explain based on the ESLint metadata.</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex items-start gap-4">
                    <motion.div 
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0"
                    >
                      <Sparkles className="size-5 text-white" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex-1 p-6 rounded-3xl bg-[#0d1117] border border-emerald-500/30 shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-linear-to-b from-emerald-500/[0.03] to-transparent pointer-events-none" />
                      
                      <div className="relative z-10">
                        <p className="text-[#c9d1d9] text-sm leading-relaxed mb-6">
                          Detected a <strong className="text-red-400 uppercase tracking-wide text-xs">Critical SQL Injection</strong> vulnerability. The Interlace ESLint plugin has provided detailed security context:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                          <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
                            <span className="block text-orange-400 font-bold text-xs mb-1 uppercase">CWE-89</span>
                            <span className="text-[10px] text-[#8b949e]">SQL Injection</span>
                          </div>
                          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                            <span className="block text-blue-400 font-bold text-xs mb-1 uppercase">OWASP A03</span>
                            <span className="text-[10px] text-[#8b949e]">Top 10 Category</span>
                          </div>
                          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                            <span className="block text-red-400 font-bold text-xs mb-1 uppercase">CVSS 9.8</span>
                            <span className="text-[10px] text-[#8b949e]">Total Risk Score</span>
                          </div>
                        </div>

                        <p className="text-[#c9d1d9] text-sm mb-4">
                          Applying the recommended <strong className="text-emerald-400 italic">Parameterized Query</strong> fix:
                        </p>

                        <div className="relative group/code rounded-xl overflow-hidden border border-[#30363d]">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                            <span className="text-[10px] font-mono text-[#8b949e]">diff — Proposed Fix</span>
                            <CheckCircle2 className="size-3 text-emerald-500" />
                          </div>
                          <pre className="p-4 bg-[#010409] font-mono text-xs overflow-x-auto">
                            <div className="text-red-400/50 line-through mb-1">
                              <span className="opacity-40">-</span> const query = &quot;SELECT * FROM users WHERE id = &quot; + userId;
                            </div>
                            <div className="text-emerald-400">
                              <span className="opacity-40">+</span> const result = <span className="text-[#ff7b72]">await</span> db.query(
                            </div>
                            <div className="text-emerald-400">
                              <span className="opacity-40">+</span>   <span className="text-[#a5d6ff]">&apos;SELECT * FROM users WHERE id = $1&apos;</span>,
                            </div>
                            <div className="text-emerald-400">
                              <span className="opacity-40">+</span>   [userId]
                            </div>
                            <div className="text-emerald-400">
                              <span className="opacity-40">+</span> );
                            </div>
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                {/* Fixed Code Editor */}
                <div className="font-mono text-xs md:text-sm space-y-2 mb-10 overflow-x-auto">
                  <div className="flex items-center gap-4 text-[#8b949e]">
                    <span className="text-[#6e7681] select-none w-8 text-right opacity-40">18</span>
                    <span className="text-[#ff7b72]">async function</span>
                    <span className="text-[#d2a8ff]">getUserById</span>
                    <span className="text-[#c9d1d9]">(userId: string) {'{'}</span>
                  </div>
                  
                  {/* Fixed Line with Neon Glow */}
                  <motion.div 
                    initial={{ boxShadow: "0 0 0px rgba(16, 185, 129, 0)" }}
                    animate={{ 
                      boxShadow: ["0 0 0px rgba(16, 185, 129, 0)", "0 0 40px rgba(16, 185, 129, 0.1)", "0 0 0px rgba(16, 185, 129, 0)"] 
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative py-2 bg-emerald-500/5 rounded-md border-l-2 border-emerald-500 shadow-2xl shadow-emerald-500/5 placeholder-box"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-[#6e7681] select-none w-8 text-right opacity-40 font-bold italic">19</span>
                      <div>
                        <span className="text-[#ff7b72]">const</span>
                        <span className="text-[#c9d1d9]"> result = </span>
                        <span className="text-[#ff7b72]">await</span>
                        <span className="text-[#c9d1d9]"> db.query(</span>
                        <br />
                        <span className="ml-4 text-emerald-300">&apos;SELECT * FROM users WHERE id = $1&apos;</span>
                        <span className="text-[#c9d1d9]">,</span>
                        <br />
                        <span className="ml-4 text-[#c9d1d9]">[userId]</span>
                        <br />
                        <span className="text-[#c9d1d9]">);</span>
                      </div>
                    </div>
                  </motion.div>

                  <div className="flex items-center gap-4 text-[#8b949e] pt-2">
                    <span className="text-[#6e7681] select-none w-8 text-right opacity-40">23</span>
                    <span className="text-[#ff7b72]">return</span>
                    <span className="text-[#c9d1d9]"> result.rows[0];</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[#8b949e]">
                    <span className="text-[#6e7681] select-none w-8 text-right opacity-40">24</span>
                    <span className="text-[#c9d1d9]">{'}'}</span>
                  </div>
                </div>

                {/* Success Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="p-8 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <CheckCircle2 className="size-16 text-emerald-500/20" />
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="size-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-emerald-400 tracking-tight uppercase">Verified Secure</h3>
                      </div>
                      <p className="text-[#8b949e] text-sm max-w-sm">
                        This fix has been validated against OWASP Top 10 standards and CWE-89 requirements.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Latency', value: '180ms' },
                        { label: 'Security', value: '100%' },
                        { label: 'Accuracy', value: '99.9%' },
                        { label: 'Verdict', value: 'PASS' },
                      ].map((item) => (
                        <div key={item.label} className="px-4 py-2 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md">
                          <span className="block text-[8px] text-[#8b949e] uppercase font-bold tracking-widest leading-tight">{item.label}</span>
                          <span className="text-emerald-400 font-mono font-bold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="text-center mt-12 space-y-6"
      >
        <div className="flex items-center justify-center gap-8 opacity-40">
           <span className="text-xs font-bold uppercase tracking-widest">Supports Leading agents</span>
           <div className="h-px w-20 bg-linear-to-r from-transparent via-fd-border to-transparent" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-black text-[#8b949e] uppercase tracking-tighter">
          <span className="hover:text-fd-foreground transition-colors">GitHub Copilot</span>
          <span className="w-1.5 h-1.5 rounded-full bg-fd-border" />
          <span className="hover:text-fd-foreground transition-colors">Cursor AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-fd-border" />
          <span className="hover:text-fd-foreground transition-colors">Claude Dev</span>
          <span className="w-1.5 h-1.5 rounded-full bg-fd-border" />
          <span className="hover:text-fd-foreground transition-colors">Antigravity</span>
          <span className="w-1.5 h-1.5 rounded-full bg-fd-border" />
          <span className="hover:text-fd-foreground transition-colors">Codeium</span>
        </div>
      </motion.div>
    </div>
  );
}
