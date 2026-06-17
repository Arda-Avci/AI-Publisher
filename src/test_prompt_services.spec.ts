import { describe, it, expect } from 'vitest';
import {
  enhanceVideoPrompt,
  generateTutorialPrompts,
  generateLandingPageAssets,
  generateCustomThemes,
} from './services/aiService.js';

describe('Prompt and Theme Services Tests', () => {
  it('should enhance user prompt correctly', async () => {
    const result = await enhanceVideoPrompt('cat walking in space', {
      cameraMotion: 'zoom_in',
      templateStyle: 'cinematic',
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  }, 60000);

  it('should generate tutorial prompts', async () => {
    const result = await generateTutorialPrompts('clipper');
    expect(result).toHaveProperty('tutorialTitle');
    expect(result).toHaveProperty('scenes');
    expect(Array.isArray(result.scenes)).toBe(true);
  }, 60000);

  it('should generate landing page assets', async () => {
    const result = await generateLandingPageAssets('technology');
    expect(result).toHaveProperty('heroVideo');
    expect(result.heroVideo).toHaveProperty('title');
    expect(result.heroVideo).toHaveProperty('prompt');
  }, 60000);

  it('should generate custom HSL themes', async () => {
    const result = await generateCustomThemes('cyberpunk');
    expect(result).toHaveProperty('themeName');
    expect(result).toHaveProperty('colors');
    expect(result.colors).toHaveProperty('background');
  }, 60000);
});
