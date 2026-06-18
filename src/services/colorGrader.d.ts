/**
 * Color Grader Service — Doğal Dil Komutlarıyla Renk Filtreleri
 * @description "sıcak sinematik tonlar", "neon mor", "doygun yeşil" gibi
 * doğal dil komutlarını FFmpeg renk filtrelerine dönüştürür.
 */
export interface ColorGrade {
    type: 'preset' | 'lut' | 'custom';
    preset?: 'warm' | 'cool' | 'cinematic' | 'neon' | 'vintage' | 'desaturated' | 'highContrast';
    lutPath?: string;
    custom?: {
        r: string;
        g: string;
        b: string;
        brightness: number;
        contrast: number;
        saturation: number;
    };
}
/**
 * Doğal dil renk komutlarını parse eder.
 * @param command — "sıcak sinematik tonlar", "neon mor", "doygun yeşil" gibi
 * @returns Parse edilmiş komut
 */
export declare function parseColorCommand(command: string): ColorGrade;
/** Belirli bir hue için özel renk grading oluşturur */
export declare function buildHueGrade(hue: string): ColorGrade;
/**
 * FFmpeg ile renk grading uygular.
 * @param videoPath — Giriş video yolu
 * @param grade — Renk grading parametreleri
 * @param outputPath — Çıktı video yolu
 */
export declare function applyColorGrade(videoPath: string, grade: ColorGrade, outputPath: string): Promise<void>;
/**
 * .cube LUT dosyası uygular.
 * @param videoPath — Giriş video
 * @param lutPath — .cube LUT dosyası yolu
 * @param outputPath — Çıktı video
 */
export declare function applyLUT(videoPath: string, lutPath: string, outputPath: string): Promise<void>;
/**
 * Doğal dil komutundan dinamik .cube LUT dosyası üretir.
 * @param command — "sıcak", "neon mor", "doygun yeşil" gibi komut
 * @returns Geçici LUT dosyası yolu
 */
export declare function generateLUTFromCommand(command: string): Promise<string>;
/**
 * FFmpeg colorbalance filtresi ile gölge/ortatone/vurgu ayarı.
 * @param videoPath — Giriş video
 * @param shadows — Gölge ayarı (ör: "0.1/-0.05/0.0")
 * @param midtones — Ortatone ayarı
 * @param highlights — Vurgu ayarı
 * @param outputPath — Çıktı video
 */
export declare function colorBalance(videoPath: string, shadows: string, midtones: string, highlights: string, outputPath: string): Promise<void>;
//# sourceMappingURL=colorGrader.d.ts.map