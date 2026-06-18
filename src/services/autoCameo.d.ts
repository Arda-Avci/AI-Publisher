export interface CharacterImage {
    label: string;
    imageBase64: string;
    sourcePhotoPath?: string;
}
export interface AutoCameoResult {
    characterImages: CharacterImage[];
    mapping: Array<{
        character: string;
        sourceLabel: string;
        confidence: number;
    }>;
}
export declare function extractCharacters(characterFeatures: string, materialPath?: string): Promise<CharacterImage[]>;
export declare function generateAvatarImages(characters: CharacterImage[]): Promise<CharacterImage[]>;
export declare function saveCharacterImages(characters: CharacterImage[], jobId: number): Promise<string[]>;
export declare function loadCharacterImages(jobId: number): Promise<Map<string, string>>;
//# sourceMappingURL=autoCameo.d.ts.map