'use client';

import React from 'react';
import { usePluginInfo } from '@/lib/api';
import { CompactBadges } from './CompactBadges';
import { motion } from 'motion/react';

interface PluginHeaderProps {
  plugin: string;
}

export function PluginHeader({ plugin }: PluginHeaderProps) {
  const { data: info, isLoading } = usePluginInfo(plugin);
  
  const slug = plugin.startsWith('eslint-plugin-') ? plugin.replace('eslint-plugin-', '') : plugin;
  const fullName = plugin.startsWith('eslint-plugin-') ? plugin : `eslint-plugin-${plugin}`;
  
  const badges = [
    {
      src: `https://img.shields.io/npm/v/${fullName}.svg?style=flat-square&color=8b5cf6`,
      alt: 'NPM Version',
      href: `https://www.npmjs.com/package/${fullName}`
    },
    {
      src: `https://img.shields.io/npm/dm/${fullName}.svg?style=flat-square&color=ec4899`,
      alt: 'NPM Downloads',
      href: `https://www.npmjs.com/package/${fullName}`
    },
    {
      src: `https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square`,
      alt: 'License'
    },
    {
      src: `https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=${slug}&style=flat-square`,
      alt: 'Codecov',
      href: `https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=${slug}`
    },
    {
      src: `https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white&style=flat-square`,
      alt: 'Since Dec 2025',
      href: 'https://github.com/ofri-peretz/eslint'
    }
  ];

  return (
    <div className="flex flex-col items-center text-center mb-12 min-h-[300px]">
      {/* 1. Logo - Static, render immediately */}
      <div className="mb-6 h-[120px] flex items-center justify-center">
        <a href="https://eslint.interlace.tools" target="blank">
          <img 
            src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" 
            alt="ESLint Interlace Logo" 
            width="120" 
            className="hover:scale-105 transition-transform duration-300"
          />
        </a>
      </div>

      {/* 2. Title - Static string derived from prop */}
      <h1 className="text-4xl font-black tracking-tight mb-4 m-0 bg-linear-to-b from-fd-foreground to-fd-foreground/70 bg-clip-text text-transparent">
        {fullName}
      </h1>

      {/* 3. One-Liner - Dynamic Stats Source */}
      <div className="min-h-[2.5rem] flex items-center justify-center mb-6 w-full px-4">
        {isLoading ? (
          <div className="h-6 w-full max-w-lg bg-fd-muted rounded-md animate-pulse" />
        ) : (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg text-fd-muted-foreground max-w-2xl leading-relaxed m-0"
          >
            {info?.description || "Security and quality rules for modern JavaScript environments."}
          </motion.p>
        )}
      </div>

      {/* 4. Badges - EXPLICITLY CENTERED */}
      <div className="flex justify-center w-full min-h-[24px]">
        {isLoading ? (
          <div className="flex gap-2 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-[20px] w-16 bg-fd-muted rounded-sm" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <CompactBadges 
              badges={badges} 
              className="justify-center"
              gap={8}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
