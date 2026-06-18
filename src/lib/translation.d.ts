export declare const SUPPORTED_LANGS: readonly ["tr", "en", "de", "fr", "es"];
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export declare const LANG_NAMES: Record<SupportedLang, string>;
export declare function isSupportedLang(code: string): code is SupportedLang;
export declare function cleanText(raw: string): Promise<string>;
export declare function translateText(text: string, targetLang: SupportedLang): Promise<string>;
export declare function translateTitleAndDesc(title: string, desc: string, targetLang: SupportedLang): Promise<{
    title: string;
    desc: string;
}>;
export declare function rewriteTranscript(translatedTranscript: string, targetLang: SupportedLang): Promise<string>;
export interface GeneratedScene {
    sceneNumber: number;
    videoPrompt: string;
    speechText: string;
    sfxPrompt: string;
}
export declare function generateScenePrompts(content: string, targetLang: SupportedLang): Promise<GeneratedScene[]>;
//# sourceMappingURL=translation.d.ts.map