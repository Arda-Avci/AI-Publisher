/**
 * Color Grader Service — Doğal Dil Komutlarıyla Renk Filtreleri
 * @description "sıcak sinematik tonlar", "neon mor", "doygun yeşil" gibi
 * doğal dil komutlarını FFmpeg renk filtrelerine dönüştürür.
 */

import path from 'path';
import fs from 'fs-extra';
import { runInWorker, WorkerResult } from './videoService.js';
import { Logger } from '../lib/logger.js';

// ── Tipler ──────────────────────────────────────────────────────────────────

export interface ColorGrade {
  type: 'preset' | 'lut' | 'custom';
  preset?: 'warm' | 'cool' | 'cinematic' | 'neon' | 'vintage' | 'desaturated' | 'highContrast';
  lutPath?: string;
  custom?: {
    r: string;   // hex veya "preserve"
    g: string;
    b: string;
    brightness: number;  // -1 ile 1 arası
    contrast: number;    // -1 ile 1 arası
    saturation: number;  // 0 ile 3 arası
  };
}

interface ParsedColorCommand {
  temperature?: 'warm' | 'cool';
  mood?: 'cinematic' | 'neon' | 'vintage';
  saturation?: 'doygun' | 'düşük' | 'normal';
  contrast?: 'yüksek' | 'düşük' | 'normal';
  primaryHue?: string; // "mor", "mavi", "yeşil", "kırmızı", "sarı", "turuncu"
}

// ── Preset Filtre Parametreleri ─────────────────────────────────────────────

const PRESET_PARAMS: Record<string, {
  eq_brightness: number;
  eq_contrast: number;
  eq_saturation: number;
  eq_gamma_r: number;
  eq_gamma_g: number;
  eq_gamma_b: number;
  colorbalance_shadows_r: number;
  colorbalance_shadows_g: number;
  colorbalance_shadows_b: number;
  colorbalance_midtones_r: number;
  colorbalance_midtones_g: number;
  colorbalance_midtones_b: number;
}> = {
  warm: {
    eq_brightness: 0.0, eq_contrast: 1.1, eq_saturation: 1.15,
    eq_gamma_r: 1.1, eq_gamma_g: 1.0, eq_gamma_b: 0.9,
    colorbalance_shadows_r: 0.1, colorbalance_shadows_g: 0.05, colorbalance_shadows_b: -0.1,
    colorbalance_midtones_r: 0.08, colorbalance_midtones_g: 0.03, colorbalance_midtones_b: -0.06
  },
  cool: {
    eq_brightness: 0.0, eq_contrast: 1.05, eq_saturation: 1.1,
    eq_gamma_r: 0.9, eq_gamma_g: 1.0, eq_gamma_b: 1.1,
    colorbalance_shadows_r: -0.1, colorbalance_shadows_g: -0.05, colorbalance_shadows_b: 0.1,
    colorbalance_midtones_r: -0.06, colorbalance_midtones_g: -0.03, colorbalance_midtones_b: 0.08
  },
  cinematic: {
    eq_brightness: -0.05, eq_contrast: 1.2, eq_saturation: 0.9,
    eq_gamma_r: 1.05, eq_gamma_g: 1.0, eq_gamma_b: 0.95,
    colorbalance_shadows_r: 0.05, colorbalance_shadows_g: 0.03, colorbalance_shadows_b: 0.0,
    colorbalance_midtones_r: 0.03, colorbalance_midtones_g: 0.02, colorbalance_midtones_b: -0.02
  },
  neon: {
    eq_brightness: 0.05, eq_contrast: 1.4, eq_saturation: 1.8,
    eq_gamma_r: 1.2, eq_gamma_g: 1.0, eq_gamma_b: 1.3,
    colorbalance_shadows_r: 0.1, colorbalance_shadows_g: -0.05, colorbalance_shadows_b: 0.2,
    colorbalance_midtones_r: 0.15, colorbalance_midtones_g: 0.0, colorbalance_midtones_b: 0.25
  },
  vintage: {
    eq_brightness: -0.1, eq_contrast: 0.9, eq_saturation: 0.7,
    eq_gamma_r: 1.0, eq_gamma_g: 0.95, eq_gamma_b: 0.85,
    colorbalance_shadows_r: 0.15, colorbalance_shadows_g: 0.1, colorbalance_shadows_b: 0.05,
    colorbalance_midtones_r: 0.1, colorbalance_midtones_g: 0.08, colorbalance_midtones_b: 0.0
  },
  desaturated: {
    eq_brightness: 0.0, eq_contrast: 1.1, eq_saturation: 0.4,
    eq_gamma_r: 1.0, eq_gamma_g: 1.0, eq_gamma_b: 1.0,
    colorbalance_shadows_r: 0.0, colorbalance_shadows_g: 0.0, colorbalance_shadows_b: 0.0,
    colorbalance_midtones_r: 0.0, colorbalance_midtones_g: 0.0, colorbalance_midtones_b: 0.0
  },
  highContrast: {
    eq_brightness: 0.0, eq_contrast: 1.6, eq_saturation: 1.2,
    eq_gamma_r: 1.1, eq_gamma_g: 1.0, eq_gamma_b: 1.05,
    colorbalance_shadows_r: 0.1, colorbalance_shadows_g: 0.05, colorbalance_shadows_b: 0.0,
    colorbalance_midtones_r: 0.05, colorbalance_midtones_g: 0.0, colorbalance_midtones_b: -0.05
  }
};

// ── Doğal Dil Parse ──────────────────────────────────────────────────────────

const HUE_MAP: Record<string, { r: number; g: number; b: number }> = {
  purple: { r: 128, g: 0, b: 128 }, blue: { r: 0, g: 0, b: 255 },
  green: { r: 0, g: 128, b: 0 }, red: { r: 255, g: 0, b: 0 },
  yellow: { r: 255, g: 255, b: 0 }, orange: { r: 255, g: 165, b: 0 },
  cyan: { r: 0, g: 255, b: 255 }, magenta: { r: 255, g: 0, b: 255 },
  white: { r: 255, g: 255, b: 255 }, black: { r: 0, g: 0, b: 0 },
};

/**
 * Doğal dil renk komutlarını parse eder.
 * @param command — "sıcak sinematik tonlar", "neon mor", "doygun yeşil" gibi
 * @returns Parse edilmiş komut
 */
export function parseColorCommand(command: string): ColorGrade {
  const lower = command.toLowerCase();

  // Preset tespiti
  if (lower.includes('neon')) {
    if (lower.includes('mor') || lower.includes('purple')) {
      return { type: 'preset', preset: 'neon' };
    }
    return { type: 'preset', preset: 'neon' };
  }

  if (lower.includes('sıcak') || lower.includes('warm') || lower.includes('sicak')) {
    return { type: 'preset', preset: 'warm' };
  }

  if (lower.includes('soğuk') || lower.includes('cool') || lower.includes('soguk')) {
    return { type: 'preset', preset: 'cool' };
  }

  if (lower.includes('sinematik') || lower.includes('cinematic')) {
    return { type: 'preset', preset: 'cinematic' };
  }

  if (lower.includes('vintage') || lower.includes('retro') || lower.includes('eski')) {
    return { type: 'preset', preset: 'vintage' };
  }

  if (lower.includes('soluk') || lower.includes('desaturated') || lower.includes('düşük renk')) {
    return { type: 'preset', preset: 'desaturated' };
  }

  if (lower.includes('yüksek kontrast') || lower.includes('high contrast') || lower.includes('yuksek kontrast')) {
    return { type: 'preset', preset: 'highContrast' };
  }

  // Doygunluk bazlı
  if (lower.includes('doygun') || lower.includes('vibrant') || lower.includes('canlı')) {
    return {
      type: 'custom',
      preset: undefined,
      custom: {
        r: 'preserve', g: 'preserve', b: 'preserve',
        brightness: 0.05, contrast: 1.2, saturation: 1.6
      }
    };
  }

  // Hue bazlı
  const hueMap: Record<string, string> = {
    'mor': 'purple', 'mavi': 'blue', 'yeşil': 'green',
    'kırmızı': 'red', 'sarı': 'yellow', 'turuncu': 'orange'
  };

  for (const [tr, en] of Object.entries(hueMap)) {
    if (lower.includes(tr) || lower.includes(en)) {
      return buildHueGrade(en);
    }
  }

  // Varsayılan: sinematik
  Logger.warn(`parseColorCommand: komut tanınamadı "${command}", varsayılan cinematic uygulandı`);
  return { type: 'preset', preset: 'cinematic' };
}

/** Belirli bir hue için özel renk grading oluşturur */
export function buildHueGrade(hue: string): ColorGrade {
  const hueParams: Record<string, { r: number; g: number; b: number }> = {
    purple: { r: 0.8, g: 0.2, b: 1.0 },
    blue: { r: 0.3, g: 0.5, b: 1.0 },
    green: { r: 0.3, g: 1.0, b: 0.4 },
    red: { r: 1.0, g: 0.3, b: 0.3 },
    yellow: { r: 1.0, g: 0.9, b: 0.3 },
    orange: { r: 1.0, g: 0.6, b: 0.2 }
  };

  const params = hueParams[hue] || { r: 1.0, g: 1.0, b: 1.0 };

  return {
    type: 'custom',
    custom: {
      r: params.r.toFixed(2),
      g: params.g.toFixed(2),
      b: params.b.toFixed(2),
      brightness: 0.0,
      contrast: 1.15,
      saturation: 1.3
    }
  };
}

// ── Renk Uygulama ────────────────────────────────────────────────────────────

/**
 * FFmpeg ile renk grading uygular.
 * @param videoPath — Giriş video yolu
 * @param grade — Renk grading parametreleri
 * @param outputPath — Çıktı video yolu
 */
export async function applyColorGrade(
  videoPath: string,
  grade: ColorGrade,
  outputPath: string
): Promise<void> {
  Logger.info(`applyColorGrade: input=${videoPath}, type=${grade.type}`);

  if (grade.type === 'lut' && grade.lutPath) {
    await applyLUT(videoPath, grade.lutPath, outputPath);
    return;
  }

  if (grade.type === 'preset' && grade.preset) {
    await applyPreset(videoPath, grade.preset, outputPath);
    return;
  }

  if (grade.type === 'custom' && grade.custom) {
    await applyCustomGrade(videoPath, grade.custom, outputPath);
    return;
  }

  throw new Error(`applyColorGrade: geçersiz grade tipi`);
}

/** Preset tabanlı renk grading */
async function applyPreset(
  videoPath: string,
  preset: string,
  outputPath: string
): Promise<void> {
  const params = PRESET_PARAMS[preset];
  if (!params) {
    throw new Error(`applyPreset: bilinmeyen preset "${preset}"`);
  }

  const filter = buildEqFilter(params);
  const args = [
    '-y', '-i', videoPath,
    '-vf', filter,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outputPath
  ];

  await runInWorker<WorkerResult>('ffmpeg', args, 120000);
  Logger.info(`applyPreset: "${preset}" tamamlandi`);
}

/** Custom parametrelerle renk grading */
async function applyCustomGrade(
  videoPath: string,
  custom: ColorGrade['custom'],
  outputPath: string
): Promise<void> {
  if (!custom) return;

  const eqParts: string[] = [];

  if (custom.brightness !== undefined) {
    eqParts.push(`eq=brightness=${custom.brightness}`);
  }
  if (custom.contrast !== undefined) {
    eqParts.push(`eq=contrast=${custom.contrast}`);
  }
  if (custom.saturation !== undefined) {
    eqParts.push(`eq=saturation=${custom.saturation}`);
  }

  // RGB ayarı (colorbalance ile)
  const cbParts: string[] = [];
  if (custom.r !== 'preserve') {
    const rVal = parseFloat(custom.r);
    cbParts.push(`colorbalance=rs=${(rVal - 1) * 0.3}`);
  }
  if (custom.g !== 'preserve') {
    const gVal = parseFloat(custom.g);
    cbParts.push(`colorbalance=gs=${(gVal - 1) * 0.3}`);
  }
  if (custom.b !== 'preserve') {
    const bVal = parseFloat(custom.b);
    cbParts.push(`colorbalance=bs=${(bVal - 1) * 0.3}`);
  }

  const allFilters = [...eqParts, ...cbParts].join(',');
  const args = [
    '-y', '-i', videoPath,
    '-vf', allFilters,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outputPath
  ];

  await runInWorker<WorkerResult>('ffmpeg', args, 120000);
  Logger.info('applyCustomGrade: tamamlandi');
}

/** EQ filtresi parametrelerinden FFmpeg filter string oluşturur */
function buildEqFilter(params: typeof PRESET_PARAMS.warm): string {
  const parts: string[] = [];

  parts.push(
    `eq=brightness=${params.eq_brightness}:` +
    `contrast=${params.eq_contrast}:` +
    `saturation=${params.eq_saturation}`
  );

  if (params.eq_gamma_r !== 1.0 || params.eq_gamma_g !== 1.0 || params.eq_gamma_b !== 1.0) {
    parts.push(
      `curves=r='0/${params.eq_gamma_r}':g='0/${params.eq_gamma_g}':b='0/${params.eq_gamma_b}'`
    );
  }

  if (params.colorbalance_shadows_r !== 0 || params.colorbalance_midtones_r !== 0) {
    parts.push(
      `colorbalance=` +
      `rs=${params.colorbalance_shadows_r}:` +
      `gs=${params.colorbalance_shadows_g}:` +
      `bs=${params.colorbalance_shadows_b}:` +
      `rm=${params.colorbalance_midtones_r}:` +
      `gm=${params.colorbalance_midtones_g}:` +
      `bm=${params.colorbalance_midtones_b}`
    );
  }

  return parts.join(',');
}

// ── LUT Uygulama ─────────────────────────────────────────────────────────────

/**
 * .cube LUT dosyası uygular.
 * @param videoPath — Giriş video
 * @param lutPath — .cube LUT dosyası yolu
 * @param outputPath — Çıktı video
 */
export async function applyLUT(
  videoPath: string,
  lutPath: string,
  outputPath: string
): Promise<void> {
  Logger.info(`applyLUT: lut=${lutPath}`);

  if (!(await fs.pathExists(lutPath))) {
    throw new Error(`applyLUT: LUT dosyası bulunamadı "${lutPath}"`);
  }

  const lutFilterPath = lutPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const args = [
    '-y', '-i', videoPath,
    '-vf', `lut3d=${lutFilterPath}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outputPath
  ];

  await runInWorker<WorkerResult>('ffmpeg', args, 120000);
  Logger.info('applyLUT: tamamlandi');
}

// ── Dinamik LUT Üretimi ──────────────────────────────────────────────────────

/**
 * Doğal dil komutundan dinamik .cube LUT dosyası üretir.
 * @param command — "sıcak", "neon mor", "doygun yeşil" gibi komut
 * @returns Geçici LUT dosyası yolu
 */
export async function generateLUTFromCommand(command: string): Promise<string> {
  const grade = parseColorCommand(command);
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const lutPath = path.join(uploadsDir, `lut_${Date.now()}.cube`);

  // Basit 33x33x33 LUT oluştur
  const size = 33;
  const lines: string[] = [];

  lines.push(`LUT_3D_SIZE ${size}`);
  lines.push('');
  lines.push('TITLE "Generated LUT"');
  lines.push('');

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);

        let nr = rf, ng = gf, nb = bf;

        if (grade.type === 'preset' && grade.preset) {
          const params = PRESET_PARAMS[grade.preset];
          if (params) {
            // Basit ton eşleme
            nr = Math.min(1.0, rf * params.eq_gamma_r);
            ng = Math.min(1.0, gf * params.eq_gamma_g);
            nb = Math.min(1.0, bf * params.eq_gamma_b);

            // Kontrast
            nr = ((nr - 0.5) * params.eq_contrast) + 0.5;
            ng = ((ng - 0.5) * params.eq_contrast) + 0.5;
            nb = ((nb - 0.5) * params.eq_contrast) + 0.5;

            // Parlaklık
            nr += params.eq_brightness;
            ng += params.eq_brightness;
            nb += params.eq_brightness;
          }
        } else if (grade.type === 'custom' && grade.custom) {
          const c = grade.custom;
          nr = ((nr - 0.5) * c.contrast) + 0.5 + c.brightness;
          ng = ((ng - 0.5) * c.contrast) + 0.5 + c.brightness;
          nb = ((nb - 0.5) * c.contrast) + 0.5 + c.brightness;

          nr = nr * c.saturation;
          ng = ng * c.saturation;
          nb = nb * c.saturation;
        }

        lines.push(
          `${Math.max(0, Math.min(1, nr)).toFixed(4)} ` +
          `${Math.max(0, Math.min(1, ng)).toFixed(4)} ` +
          `${Math.max(0, Math.min(1, nb)).toFixed(4)}`
        );
      }
    }
  }

  await fs.writeFile(lutPath, lines.join('\n'));
  Logger.info(`generateLUTFromCommand: "${command}" -> ${lutPath}`);
  return lutPath;
}

// ── Color Balance ────────────────────────────────────────────────────────────

/**
 * FFmpeg colorbalance filtresi ile gölge/ortatone/vurgu ayarı.
 * @param videoPath — Giriş video
 * @param shadows — Gölge ayarı (ör: "0.1/-0.05/0.0")
 * @param midtones — Ortatone ayarı
 * @param highlights — Vurgu ayarı
 * @param outputPath — Çıktı video
 */
export async function colorBalance(
  videoPath: string,
  shadows: string,
  midtones: string,
  highlights: string,
  outputPath: string
): Promise<void> {
  Logger.info(`colorBalance: shadows=${shadows}, midtones=${midtones}, highlights=${highlights}`);

  const parseTriple = (s: string): string => {
    // "0.1/-0.05/0.0" -> "0.1:-0.05:0.0"
    return s.replace(/\//g, ':');
  };

  const filter = `colorbalance=rs=${parseTriple(shadows)}:gs=${parseTriple(shadows)}:bs=${parseTriple(shadows)}:` +
    `rm=${parseTriple(midtones)}:gm=${parseTriple(midtones)}:bm=${parseTriple(midtones)}:` +
    `rh=${parseTriple(highlights)}:gh=${parseTriple(highlights)}:bh=${parseTriple(highlights)}`;

  const args = [
    '-y', '-i', videoPath,
    '-vf', filter,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outputPath
  ];

  await runInWorker<WorkerResult>('ffmpeg', args, 120000);
  Logger.info('colorBalance: tamamlandi');
}
