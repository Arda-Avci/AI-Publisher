import { describe, it, expect } from 'vitest';
import {
  enhanceShortFormPrompt,
  enhanceFilmPrompt,
  getShortFormConfig,
} from './services/promptEnhancer.js';

describe('promptEnhancer', () => {
  describe('getShortFormConfig', () => {
    it('returns default config when no duration', () => {
      const cfg = getShortFormConfig();
      expect(cfg.maxDurationSec).toBe(60);
      expect(cfg.hookStrategy).toBe('scale_shock');
      expect(cfg.loopRequired).toBe(true);
      expect(cfg.retentionTactics.length).toBeGreaterThanOrEqual(3);
    });

    it('caps duration at 60', () => {
      const cfg = getShortFormConfig(120);
      expect(cfg.maxDurationSec).toBe(60);
    });

    it('accepts shorter duration', () => {
      const cfg = getShortFormConfig(30);
      expect(cfg.maxDurationSec).toBe(30);
    });
  });

  describe('enhanceShortFormPrompt', () => {
    it('returns EnhancedPrompt with hook_body_loop structure', () => {
      const result = enhanceShortFormPrompt('Test prompt', 'Test notes');
      expect(result.masterPrompt).toContain('Test prompt');
      expect(result.masterPrompt).toContain('SHORT FORM VIDEO STRUCTURE');
      expect(result.sceneStructure).toBe('hook_body_loop');
    });

    it('includes constraints based on config', () => {
      const result = enhanceShortFormPrompt('Test', 'Notes', {
        hookStrategy: 'question',
        loopRequired: false,
        maxDurationSec: 30,
      });
      expect(result.constraints.some(c => c.includes('30 seconds'))).toBe(true);
      expect(result.constraints.some(c => c.includes('question'))).toBe(true);
      expect(result.constraints.some(c => c.includes('Seamless loop'))).toBe(false);
    });

    it('defaults to scale_shock hook', () => {
      const result = enhanceShortFormPrompt('Test', '');
      expect(result.constraints.some(c => c.includes('scale_shock'))).toBe(true);
    });

    it('handles empty productionNotes', () => {
      const result = enhanceShortFormPrompt('Alone', '');
      expect(result.productionNotes).toContain('Short-form constraints');
    });
  });

  describe('enhanceFilmPrompt', () => {
    it('returns EnhancedPrompt with narrative_arc structure', () => {
      const result = enhanceFilmPrompt('Film prompt', 'Film notes');
      expect(result.masterPrompt).toContain('Film prompt');
      expect(result.masterPrompt).toContain('CINEMATIC ENHANCEMENTS');
      expect(result.sceneStructure).toBe('narrative_arc');
    });

    it('includes all 4 cinematic constraints', () => {
      const result = enhanceFilmPrompt('Test', 'Notes');
      expect(result.constraints.some(c => c.includes('Cultural dialogue'))).toBe(true);
      expect(result.constraints.some(c => c.includes('Subtext'))).toBe(true);
      expect(result.constraints.some(c => c.includes('DoP lighting'))).toBe(true);
      expect(result.constraints.some(c => c.includes('Scene blocking'))).toBe(true);
    });

    it('handles empty productionNotes', () => {
      const result = enhanceFilmPrompt('Film', '');
      expect(result.productionNotes).toBeTruthy();
      expect(result.productionNotes).toContain('Cultural dialogue');
    });
  });
});
