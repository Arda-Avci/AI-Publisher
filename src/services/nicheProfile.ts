import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Logger } from '../lib/logger.js';

export interface NicheProfile {
  id: string;
  name: string;
  description: string;
  platformRules: Record<
    string,
    {
      hookStyle: string;
      pacing: string;
      visualStyle: string;
      audioStyle: string;
      hashtagStrategy: string;
    }
  >;
  audience: {
    ageRange: string;
    interests: string[];
    painPoints: string[];
    contentLength: string;
  };
}

const NicheAnalysisSchema = z.object({
  niche: z.string(),
  audienceProfile: z.object({
    ageRange: z.string(),
    interests: z.array(z.string()),
    painPoints: z.array(z.string()),
    contentLength: z.string(),
  }),
  platformRules: z.object({
    youtube: z.object({
      hookStyle: z.string(),
      pacing: z.string(),
      visualStyle: z.string(),
      audioStyle: z.string(),
      hashtagStrategy: z.string(),
    }),
    tiktok: z.object({
      hookStyle: z.string(),
      pacing: z.string(),
      visualStyle: z.string(),
      audioStyle: z.string(),
      hashtagStrategy: z.string(),
    }),
    x: z.object({
      hookStyle: z.string(),
      pacing: z.string(),
      visualStyle: z.string(),
      audioStyle: z.string(),
      hashtagStrategy: z.string(),
    }),
    meta: z.object({
      hookStyle: z.string(),
      pacing: z.string(),
      visualStyle: z.string(),
      audioStyle: z.string(),
      hashtagStrategy: z.string(),
    }),
  }),
});

const BUILT_IN_NICHES: Record<string, NicheProfile> = {
  gaming_minecraft: {
    id: 'gaming_minecraft',
    name: 'Minecraft Gaming',
    description: 'Minecraft speedrun, build battle, survival challenge content',
    platformRules: {
      youtube: {
        hookStyle: 'fast_cut_action',
        pacing: 'moderate',
        visualStyle: 'gameplay_focused',
        audioStyle: 'energetic_bg',
        hashtagStrategy: '#minecraft #gaming #survival',
      },
      tiktok: {
        hookStyle: 'question_challenge',
        pacing: 'fast',
        visualStyle: 'vertical_gameplay',
        audioStyle: 'trending_sound',
        hashtagStrategy: '#minecrafttiktok #gamingfyp',
      },
      x: {
        hookStyle: 'stat_achievement',
        pacing: 'concise',
        visualStyle: 'before_after',
        audioStyle: 'none',
        hashtagStrategy: '#Minecraft #GamingCommunity',
      },
      meta: {
        hookStyle: 'story_tell',
        pacing: 'moderate',
        visualStyle: 'splitscreen',
        audioStyle: 'background_music',
        hashtagStrategy: '#minecraft #gaming #reels',
      },
    },
    audience: {
      ageRange: '13-25',
      interests: ['minecraft', 'gaming', 'building', 'survival'],
      painPoints: ['boring gameplay', 'long videos', 'no progression'],
      contentLength: '30-60sn',
    },
  },
  comedy_sketch: {
    id: 'comedy_sketch',
    name: 'Comedy & Sketch',
    description: 'Short comedy sketches, parody, humorous commentary',
    platformRules: {
      youtube: {
        hookStyle: 'setup_punchline',
        pacing: 'rhythmic',
        visualStyle: 'closeup_face',
        audioStyle: 'laughter_track',
        hashtagStrategy: '#comedy #sketch #funny',
      },
      tiktok: {
        hookStyle: 'immediate_joke',
        pacing: 'rapid_fire',
        visualStyle: 'green_screen',
        audioStyle: 'trending_audio',
        hashtagStrategy: '#fyp #comedy #viral',
      },
      x: {
        hookStyle: 'hot_take',
        pacing: 'quick',
        visualStyle: 'text_overlay',
        audioStyle: 'none',
        hashtagStrategy: '#Comedy #HotTake',
      },
      meta: {
        hookStyle: 'relatable',
        pacing: 'moderate',
        visualStyle: 'facecam',
        audioStyle: 'background_beat',
        hashtagStrategy: '#comedy #reels #relatable',
      },
    },
    audience: {
      ageRange: '18-35',
      interests: ['humor', 'memes', 'pop culture', 'parody'],
      painPoints: ['too long setup', 'unfunny content', 'overdone topics'],
      contentLength: '15-45sn',
    },
  },
  educational: {
    id: 'educational',
    name: 'Educational & How-To',
    description: 'Tutorials, explainers, educational shorts',
    platformRules: {
      youtube: {
        hookStyle: 'problem_solution',
        pacing: 'steady',
        visualStyle: 'slides_text',
        audioStyle: 'clear_narration',
        hashtagStrategy: '#tutorial #education #howto',
      },
      tiktok: {
        hookStyle: 'did_you_know',
        pacing: 'fast',
        visualStyle: 'text_overlay',
        audioStyle: 'voiceover',
        hashtagStrategy: '#learnontiktok #education',
      },
      x: {
        hookStyle: 'fact_thread',
        pacing: 'dense',
        visualStyle: 'infographic',
        audioStyle: 'none',
        hashtagStrategy: '#Education #Thread',
      },
      meta: {
        hookStyle: 'quick_tip',
        pacing: 'moderate',
        visualStyle: 'demo_footage',
        audioStyle: 'voiceover_bg',
        hashtagStrategy: '#education #reels #tips',
      },
    },
    audience: {
      ageRange: '20-45',
      interests: ['learning', 'self-improvement', 'science', 'technology'],
      painPoints: ['complex explanations', 'boring delivery', 'too long'],
      contentLength: '30-90sn',
    },
  },
};

function findBuiltInNiche(input: string): NicheProfile | null {
  const lower = input.toLowerCase();
  for (const [key, profile] of Object.entries(BUILT_IN_NICHES)) {
    if (lower.includes(key) || lower.includes(profile.name.toLowerCase())) {
      return profile;
    }
  }
  if (lower.includes('game') || lower.includes('oyun'))
    return BUILT_IN_NICHES.gaming_minecraft as NicheProfile;
  if (lower.includes('komedi') || lower.includes('funny') || lower.includes('comedy'))
    return BUILT_IN_NICHES.comedy_sketch as NicheProfile;
  if (
    lower.includes('eğitim') ||
    lower.includes('education') ||
    lower.includes('tutorial') ||
    lower.includes('how')
  )
    return BUILT_IN_NICHES.educational as NicheProfile;
  return null;
}

export async function analyzeNiche(
  masterPrompt: string,
  productionNotes?: string,
): Promise<{ profile: NicheProfile; applied: boolean }> {
  const builtIn = findBuiltInNiche(masterPrompt + ' ' + (productionNotes || ''));
  if (builtIn) {
    Logger.info('[NICHE] Built-in match found:', builtIn.name);
    return { profile: builtIn, applied: true };
  }

  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: NicheAnalysisSchema,
      prompt: `Analyze this content brief and identify the niche + audience profile.

Master Prompt: "${masterPrompt}"
Production Notes: "${productionNotes || ''}"

Output detailed platform-specific rules for each social platform.`,
    });

    const profile: NicheProfile = {
      id: object.niche.toLowerCase().replace(/\s+/g, '_'),
      name: object.niche,
      description: `${object.niche} — AI-generated niche profile`,
      platformRules: {
        youtube: { ...object.platformRules.youtube },
        tiktok: { ...object.platformRules.tiktok },
        x: { ...object.platformRules.x },
        meta: { ...object.platformRules.meta },
      },
      audience: { ...object.audienceProfile },
    };

    Logger.info('[NICHE] AI-generated profile:', profile.name);
    return { profile, applied: true };
  } catch (err) {
    Logger.warn('[NICHE] AI analysis failed, using default:', err);
    return {
      profile: {
        id: 'default',
        name: 'General Content',
        description: 'Default profile — no specific niche detected',
        platformRules: {
          youtube: {
            hookStyle: 'intro_hook',
            pacing: 'moderate',
            visualStyle: 'mixed',
            audioStyle: 'background_music',
            hashtagStrategy: '#content #viral',
          },
          tiktok: {
            hookStyle: 'trend_hook',
            pacing: 'fast',
            visualStyle: 'vertical',
            audioStyle: 'trending',
            hashtagStrategy: '#fyp #viral',
          },
          x: {
            hookStyle: 'value_proposition',
            pacing: 'concise',
            visualStyle: 'text',
            audioStyle: 'none',
            hashtagStrategy: '#Content',
          },
          meta: {
            hookStyle: 'story',
            pacing: 'moderate',
            visualStyle: 'mixed',
            audioStyle: 'background',
            hashtagStrategy: '#reels #content',
          },
        },
        audience: {
          ageRange: '18-45',
          interests: ['general'],
          painPoints: ['generic content'],
          contentLength: '30-60sn',
        },
      },
      applied: false,
    };
  }
}

export function getNichePromptEnhancement(
  profile: NicheProfile,
  platform: string,
  originalPrompt: string,
): string {
  const rules = profile.platformRules[platform] ||
    profile.platformRules.youtube || {
      hookStyle: 'intro_hook',
      pacing: 'moderate',
      visualStyle: 'mixed',
      audioStyle: 'background_music',
      hashtagStrategy: '#content',
    };
  return `${originalPrompt}

Style: ${rules.visualStyle}
Pacing: ${rules.pacing}
Hook: ${rules.hookStyle}
Audience: ${profile.audience.ageRange} age, interests: ${profile.audience.interests.join(', ')}
Pain points to address: ${profile.audience.painPoints.join(', ')}`;
}
