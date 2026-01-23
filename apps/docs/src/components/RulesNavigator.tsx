'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Shield, ArrowRight, Zap, Code } from 'lucide-react';
import { usePluginInfo } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BorderBeam } from './ui/border-beam';

interface RulesNavigatorProps {
  plugin: string;
}

export function RulesNavigator({ plugin }: RulesNavigatorProps) {
  const { data: info } = usePluginInfo(plugin);
  const href = `/docs/${plugin}/rules`;

  return (
    <div className="my-12 relative group">
      <Link href={href}>
        <div className={cn(
          "relative overflow-hidden rounded-3xl border border-fd-border/50 bg-fd-card/50 backdrop-blur-md p-8 sm:p-10",
          "transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/30",
          "flex flex-col md:flex-row items-center justify-between gap-8 cursor-pointer"
        )}>
          {/* Magic UI Border Beam */}
          <BorderBeam size={200} duration={12} colorFrom="#8b5cf6" colorTo="#d946ef" />

          {/* Background Shimmer */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-purple-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

          <div className="flex-1 text-center md:text-left relative z-10">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                <Shield className="size-6 shrink-0" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight m-0 bg-linear-to-r from-fd-foreground to-fd-foreground/70 bg-clip-text text-transparent">
                Browse Rules
              </h3>
            </div>
            
            <p className="text-lg text-fd-muted-foreground leading-relaxed max-w-xl m-0">
              Explore the full library of {info ? (
                <span className="text-fd-foreground font-bold">{info.rules}</span>
              ) : (
                <span className="inline-block w-8 h-4 bg-fd-muted rounded-sm animate-pulse align-middle" />
              )} specialized detection rules, each with high-fidelity documentation and LLM-ready metadata.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <motion.div
              whileHover={{ x: 5 }}
              className="flex items-center gap-3 px-8 py-4 bg-linear-to-r from-violet-600 to-purple-600 rounded-2xl text-white font-bold shadow-xl shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow"
            >
              <span>Explore All Rules</span>
              <ArrowRight className="size-5" />
            </motion.div>
          </div>
        </div>
      </Link>
    </div>
  );
}
