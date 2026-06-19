import { describe, it, expect } from 'vitest';
import {
  enhanceVideoPrompt,
  generateTutorialPrompts,
  generateLandingPageAssets,
  generateCustomThemes,
} from './services/aiService.js';

describe('Prompt and Theme Services Tests', () => {
  const hasKeys = !!(
    process.env.GEMINI_API_KEY ||
    process.env.MINIMAX_API_KEY ||
    process.env.ZEN_API_KEY
  );

  it('should enhance user prompt correctly', async () => {
    if (!hasKeys) return;
    const result = await enhanceVideoPrompt('cat walking in space', {
      cameraMotion: 'zoom_in',
      templateStyle: 'cinematic',
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  }, 60000);

  it('should generate tutorial prompts', async () => {
    if (!hasKeys) return;
    const result = await generateTutorialPrompts('clipper');
    expect(result).toHaveProperty('tutorialTitle');
    expect(result).toHaveProperty('scenes');
    expect(Array.isArray(result.scenes)).toBe(true);
  }, 60000);

  it('should generate landing page assets', async () => {
    if (!hasKeys) return;
    const result = await generateLandingPageAssets('technology');
    expect(result).toHaveProperty('heroVideo');
    expect(result.heroVideo).toHaveProperty('title');
    expect(result.heroVideo).toHaveProperty('prompt');
  }, 60000);

  it('should generate custom HSL themes', async () => {
    if (!hasKeys) return;
    const result = await generateCustomThemes('cyberpunk');
    expect(result).toHaveProperty('themeName');
    expect(result).toHaveProperty('colors');
    expect(result.colors).toHaveProperty('background');
  }, 60000);
});
