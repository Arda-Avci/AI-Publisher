export interface StoryboardFrame {
  sceneNumber: number;
  narrativePurpose: string;
  visualDescription: string;
  cameraDirective: string;
  charactersInScene: string[];
  setting: string;
  tone: string;
  durationSeconds: number;
}

export interface StoryboardScript {
  title: string;
  logline: string;
  genre: string;
  totalScenes: number;
  frames: StoryboardFrame[];
}

export interface ConvertedScene {
  sceneNumber: number;
  videoPrompt: string;
  speechText: string;
  sfxPrompt: string;
  cameraMotion: string;
  speaker: string;
  charactersInScene: string[];
}

export interface StoryboardResult {
  script: StoryboardScript;
  scenes: ConvertedScene[];
  consistencyReport?: {
    score: number;
    issues: string[];
    passed: boolean;
  };
}

export interface VectorRecord {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface StoryboardOptions {
  masterPrompt: string;
  productionNotes?: string;
  characterFeatures?: string;
  targetLanguage?: 'tr' | 'en';
  sceneCount?: number;
  durationPerScene?: number;
}
