/**
 * Story Bible Service
 * Persistent story development with characters, plot points, and world-building
 */
export interface StoryBible {
    id: number;
    userId: number;
    title: string;
    genre: string;
    description: string;
    worldSetting?: string;
    themes?: string;
    tone?: string;
    targetAudience?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface StoryCharacter {
    id: number;
    storyBibleId: number;
    name: string;
    role: string;
    description: string;
    backstory?: string;
    personality?: string;
    goals?: string;
    conflicts?: string;
    avatarUrl?: string;
}
export interface PlotPoint {
    id: number;
    storyBibleId: number;
    title: string;
    description: string;
    orderIndex: number;
    act: 'setup' | 'confrontation' | 'resolution';
}
/**
 * Create a new story bible
 */
export declare function createStoryBible(userId: number, title: string, genre: string, description: string, options?: {
    worldSetting?: string;
    themes?: string;
    tone?: string;
    targetAudience?: string;
}): Promise<StoryBible>;
/**
 * Get a story bible by ID
 */
export declare function getStoryBible(id: number): Promise<StoryBible | null>;
/**
 * Get all story bibles for a user
 */
export declare function getUserStoryBibles(userId: number): Promise<StoryBible[]>;
/**
 * Update a story bible
 */
export declare function updateStoryBible(id: number, updates: Partial<{
    title: string;
    genre: string;
    description: string;
    worldSetting: string;
    themes: string;
    tone: string;
    targetAudience: string;
}>): Promise<StoryBible | null>;
/**
 * Delete a story bible
 */
export declare function deleteStoryBible(id: number): Promise<void>;
/**
 * Add a character to a story bible
 */
export declare function addCharacter(storyBibleId: number, character: Omit<StoryCharacter, 'id' | 'storyBibleId'>): Promise<StoryCharacter>;
/**
 * Get a character by ID
 */
export declare function getCharacter(id: number): Promise<StoryCharacter | null>;
/**
 * Get all characters for a story bible
 */
export declare function getStoryCharacters(storyBibleId: number): Promise<StoryCharacter[]>;
/**
 * Update a character
 */
export declare function updateCharacter(id: number, updates: Partial<Omit<StoryCharacter, 'id' | 'storyBibleId'>>): Promise<StoryCharacter | null>;
/**
 * Delete a character
 */
export declare function deleteCharacter(id: number): Promise<void>;
/**
 * Add a plot point to a story bible
 */
export declare function addPlotPoint(storyBibleId: number, plotPoint: Omit<PlotPoint, 'id' | 'storyBibleId'>): Promise<PlotPoint>;
/**
 * Get a plot point by ID
 */
export declare function getPlotPoint(id: number): Promise<PlotPoint | null>;
/**
 * Get all plot points for a story bible
 */
export declare function getStoryPlotPoints(storyBibleId: number): Promise<PlotPoint[]>;
/**
 * Update a plot point
 */
export declare function updatePlotPoint(id: number, updates: Partial<Omit<PlotPoint, 'id' | 'storyBibleId'>>): Promise<PlotPoint | null>;
/**
 * Delete a plot point
 */
export declare function deletePlotPoint(id: number): Promise<void>;
/**
 * Generate enhanced prompts from a story bible
 */
export declare function generateFromStoryBible(storyBibleId: number, template: 'cinematic' | 'dynamic' | 'simple' | 'pixar', options?: {
    sceneCount?: number;
    includeCharacters?: boolean;
    includePlotPoints?: boolean;
}): Promise<{
    masterPrompt: string;
    productionNotes: string;
    characterFeatures: string;
    scenePrompts: string[];
}>;
//# sourceMappingURL=storyBibleService.d.ts.map