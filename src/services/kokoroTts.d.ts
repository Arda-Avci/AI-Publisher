interface KokoroTtsOptions {
    text: string;
    voice?: string;
    speed?: number;
    lang?: string;
}
export declare function synthesizeKokoro(options: KokoroTtsOptions, outputPath: string): Promise<string>;
export {};
//# sourceMappingURL=kokoroTts.d.ts.map