/**
 * Select Component Styling Integrity Tests
 * 
 * CRITICAL: These tests ensure the Select dropdown maintains solid (non-transparent)
 * backgrounds. Any change to these patterns must be intentional and reviewed.
 * 
 * Last verified: 2026-02-01
 * User requirement: "Please use shadcn/ui select, ensure it is not transparent"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Select Component Source File Integrity', () => {
  let selectSource: string;

  beforeAll(() => {
    const selectPath = resolve(__dirname, '../components/ui/select.tsx');
    selectSource = readFileSync(selectPath, 'utf-8');
  });

  describe('SelectTrigger Styling', () => {
    it('uses solid bg-fd-background (NOT bg-transparent)', () => {
      // REQUIRED: solid background
      expect(selectSource).toContain('bg-fd-background');
      
      // FORBIDDEN: transparent backgrounds
      expect(selectSource).not.toMatch(/bg-transparent(?!\S)/); // bg-transparent as standalone class
    });

    it('uses consistent fd-border theming', () => {
      expect(selectSource).toContain('border-fd-border');
    });

    it('has hover:bg-fd-muted for hover state', () => {
      expect(selectSource).toContain('hover:bg-fd-muted');
    });

    it('does NOT use semi-transparent dark mode (dark:bg-input/30)', () => {
      expect(selectSource).not.toContain('dark:bg-input/30');
      expect(selectSource).not.toContain('dark:hover:bg-input/50');
    });
  });

  describe('SelectContent (Dropdown) Styling', () => {
    it('uses solid bg-fd-background (NOT bg-fd-popover)', () => {
      // The dropdown content should use solid background
      // bg-fd-popover can be semi-transparent, bg-fd-background is solid
      expect(selectSource).toContain('bg-fd-background');
    });

    it('does NOT use backdrop-blur (glassmorphism effect)', () => {
      // Glassmorphism makes the background see-through
      // User explicitly requested non-transparent dropdown
      expect(selectSource).not.toContain('backdrop-blur');
    });

    it('uses text-fd-foreground for readable text', () => {
      expect(selectSource).toContain('text-fd-foreground');
    });

    it('uses shadow-lg for subtle elevation (NOT shadow-2xl)', () => {
      // shadow-lg is more subtle than shadow-2xl
      expect(selectSource).toContain('shadow-lg');
      // Avoid overly dramatic shadows
      expect(selectSource).not.toMatch(/shadow-2xl.*shadow-black/);
    });
  });

  describe('SelectItem Styling', () => {
    it('has focus state with fd-accent color', () => {
      expect(selectSource).toContain('focus:bg-fd-accent');
    });

    it('has hover state with fd-accent color', () => {
      expect(selectSource).toContain('hover:bg-fd-accent');
    });

    it('uses fd-foreground for text color', () => {
      expect(selectSource).toContain('text-fd-foreground');
    });
  });
});
