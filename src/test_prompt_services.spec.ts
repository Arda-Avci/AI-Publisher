import { describe, it, expect, vi } from 'vitest';
import { 
  enhanceVideoPrompt, 
  generateTutorialPrompts, 
  generateLandingPageAssets, 
  generateCustomThemes 
} from './services/aiService.js';
import { generateObject } from 'ai';

vi.mock('ai', () => ({
  generateObject: vi.fn()
}));

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn().mockReturnValue([{ modelId: 'gemini-2.5-flash' }])
}));

describe('Prompt and Theme Services Tests', () => {
  it('should enhance user prompt correctly', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { enhancedPrompt: 'Cinematic 3D render of a cat walking in space, volumetric light, highly detailed.' }
    } as any);

    const result = await enhanceVideoPrompt('cat walking in space', {
      cameraMotion: 'zoom_in',
      templateStyle: 'cinematic'
    });

    expect(result).toContain('Cinematic');
    expect(generateObject).toHaveBeenCalled();
  });

  it('should generate tutorial prompts', async () => {
    const mockTutorial = {
      tutorialTitle: 'How to use Clipper',
      scenes: [
        {
          sceneNumber: 1,
          videoPrompt: 'Show setting menu',
          speechText: 'Click here to open settings',
          sfxPrompt: 'mouse click',
          screenAction: 'click settings'
        }
      ]
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockTutorial
    } as any);

    const result = await generateTutorialPrompts('clipper');
    expect(result.tutorialTitle).toBe('How to use Clipper');
    expect(result.scenes[0].sceneNumber).toBe(1);
  });

  it('should generate landing page assets', async () => {
    const mockAssets = {
      heroVideo: {
        title: 'Welcome to AI Publisher',
        prompt: 'Futuristic movie studio animation',
        description: 'Promo video'
      },
      showcaseVideos: []
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockAssets
    } as any);

    const result = await generateLandingPageAssets('technology');
    expect(result.heroVideo.title).toBe('Welcome to AI Publisher');
  });

  it('should generate custom HSL themes', async () => {
    const mockTheme = {
      themeName: 'Cyberpunk Light',
      isDark: false,
      colors: {
        background: '280 50% 95%',
        foreground: '280 50% 10%',
        primary: '280 100% 50%',
        primaryForeground: '0 0% 100%'
      }
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockTheme
    } as any);

    const result = await generateCustomThemes('cyberpunk');
    expect(result.themeName).toBe('Cyberpunk Light');
    expect(result.colors.background).toBe('280 50% 95%');
  });
});
