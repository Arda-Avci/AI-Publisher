import { Agent, Task, Crew, Process } from '@crewai-ts/core';
import { createOutlinerAgent } from './outlinerAgent.js';
import { createSceneArchitectAgent } from './sceneArchitectAgent.js';
import { createScriptwriterAgent } from './scriptwriterAgent.js';
import { createReviewerAgent } from './reviewerAgent.js';
import { crewaiLogger } from './crewaiService.js';
import type { ScriptOutput } from '../../types/script.js';
import { getTierConfig, buildPromptWithTier } from './writerTiers.js';
import type { WriterTier } from './writerTiers.js';
import type { ArtStylePreset } from '../artStylePresets.js';
import { getPresetById } from '../artStylePresets.js';

const log = crewaiLogger('WriterCrew');

export async function runWriterPipeline(topic: string, writerTier?: WriterTier, artStyle?: string): Promise<ScriptOutput> {
  const tier = getTierConfig(writerTier);
  const preset = artStyle ? getPresetById(artStyle) : undefined;
  const MAX_REVISIONS = tier.maxRevisions;
  log.info(`Writer pipeline basliyor. Tier: ${tier.tier} Stil: ${preset?.name || 'yok'} Konu: "${topic.slice(0, 80)}..."`);

  // 1. Outliner — konsept cikar
  const concept = await runOutliner(topic, tier.tier, preset);

  // 2. Scene Architect — sahne plani
  const scenePlan = await runSceneArchitect(concept);

  // 3. Scriptwriter + Reviewer — revizyon loop
  let fullScript = '';
  let revisionCount = 0;
  let status: ScriptOutput['status'] = 'approved';

  for (let i = 0; i < MAX_REVISIONS; i++) {
    revisionCount = i + 1;

    // Scriptwriter: tum sahneleri yaz
    const scriptInput = `KONSEPT:\n${concept}\n\nSAHNE PLANI:\n${scenePlan}\n\nREVIZYON GECMISI (${i}. deneme):\n${fullScript || 'Ilk yazim'}`;
    fullScript = await runScriptwriter(scriptInput, tier.tier);

    // Reviewer: kontrol et
    const reviewInput = `KONSEPT:\n${concept}\n\nSAHNE PLANI:\n${scenePlan}\n\nYAZILAN SENARYO:\n${fullScript}`;
    const review = await runReviewer(reviewInput, tier.tier);

    if (review.includes('ONAYLANDI')) {
      log.info(`Revizyon ${i + 1}: ONAYLANDI`);
      status = revisionCount > 1 ? 'revised' : 'approved';
      break;
    }

    log.info(`Revizyon ${i + 1}: REVIZE GEREKLI. Geri bildirim: ${review.slice(0, 100)}...`);

    if (i === MAX_REVISIONS - 1) {
      status = 'max_revisions';
    }
  }

  // 4. Assembly
  const outline = parseOutline(concept);
  const scenes = parseScenePlan(scenePlan);

  log.info(`Writer pipeline tamamlandi. Revizyon: ${revisionCount}, Durum: ${status}`);

  return {
    logline: outline.logline || '',
    theme: outline.theme || '',
    genre: outline.genre || '',
    characters: outline.characters || [],
    synopsis: outline.synopsis || '',
    scenes,
    fullScript,
    revisionCount,
    status,
  };
}

async function runOutliner(topic: string, tier?: import('./writerTiers.js').WriterTier, artStyle?: ArtStylePreset): Promise<string> {
  const agent = createOutlinerAgent(artStyle);
  const baseDesc = `Kullanici Fikri: "${topic}"

    Ciktini su bolumlerden olustur ve KATI JSON formatinda (veya isaretli yapiyla) don:

    LOGLINE: Hikayenin 1-2 cumlelik vurucu ozeti.
    TEMA: Filmin ana temasi ve alt metni.
    TUR: Film turu (Gerilim, Komedi, Dram, Bilim-Kurgu vb.)
    KARAKTERLER: Ana karakter(ler) ve antagonist. Her biri icin: isim, yas, motivasyon, en buyuk zaaf, kisa aciklama.
    HIKAYE OZETI (SYNOPSIS): 3 perdelik yapiya uygun (Baslangic, Gelisme/Kirilma noktalari, Sonuc) detayli ozet.`;
  const description = tier ? buildPromptWithTier(baseDesc, tier, 'outliner') : baseDesc;
  const task = new Task({
    description,
    expectedOutput:
      'Yapilandirilmis konsept dokumani: LOGLINE, TEMA, TUR, KARAKTERLER, SYNOPSIS.',
    agent,
  });

  const crew = new Crew({
    agents: [agent],
    tasks: [task],
    process: Process.sequential,
  });

  const result = await crew.kickoff({ inputs: { topic } });
  return result.raw;
}

async function runSceneArchitect(concept: string): Promise<string> {
  const agent = createSceneArchitectAgent();
  const task = new Task({
    description: `Verilen Konsept:\n${concept}

    Hikayeyi mantikli akisla sahnelere bol. Her sahne icin su formati KESINLIKLE koru:

    SAHNE [Numara]: [IC/DIS] - [MEKAN] - [ZAMAN]
    SAHNE AMACI: Bu sahnede hikaye acisindan ne degisiyor?
    BULUNAN KARAKTERLER: Kimler var?
    OLAY ORGUSU: Sahnede yasanacak eylemin kisa tarifi.
    TAHMINI SURE: Saniye cinsinden sahne suresi (3-300 arasi, tipik 15-30 sn).`,
    expectedOutput: 'Sahne sahne planlama. Her sahne yukaridaki formatta.',
    agent,
  });

  const crew = new Crew({
    agents: [agent],
    tasks: [task],
    process: Process.sequential,
  });

  const result = await crew.kickoff({ inputs: { concept } });
  return result.raw;
}

async function runScriptwriter(input: string, tier?: import('./writerTiers.js').WriterTier): Promise<string> {
  const agent = createScriptwriterAgent();
  const baseDesc = `Filmin Genel Konsepti ve Sahne Plani:\n${input}

    KURALLAR:
    - FORMAT: [IC/DIS] - [MEKAN] - [ZAMAN] basligi ile basla.
    - Aksiyonlari genis zaman kipiyle, gorsellestirilebilir sekilde yaz.
    - DIJALOGLAR: Dogal konusma. Karakter adini BUYUK HARF ve ortali yaz.
    - Parantez ici eylemleri kisa tut.`;
  const description = tier ? buildPromptWithTier(baseDesc, tier, 'scriptwriter') : baseDesc;
  const task = new Task({
    description,
    expectedOutput:
      'Endustri standardinda senaryo metni. Tum sahneler yazilmis olmali.',
    agent,
  });

  const crew = new Crew({
    agents: [agent],
    tasks: [task],
    process: Process.sequential,
  });

  const result = await crew.kickoff({ inputs: { input } });
  return result.raw;
}

async function runReviewer(input: string, tier?: import('./writerTiers.js').WriterTier): Promise<string> {
  const agent = createReviewerAgent();
  const baseDesc = `Yazilan Senaryo:\n${input}

    Su kriterlere gore degerlendir:
    1. "Show, Don't Tell" kuralina uyulmus mu?
    2. Diyaloglar dogal mi, yoksa exposition (bilgi vermek) icin mi kullanilmis?
    3. Sahnenin amacina ulasilmis mi?

    Eger sahne mukemmelse sadece "ONAYLANDI" don.
    Sorun varsa "REVIZE GEREKLI:" yaz ve madde madde liste halinde duzeltilmesi gereken yerleri sirala.`;
  const description = tier ? buildPromptWithTier(baseDesc, tier, 'reviewer') : baseDesc;
  const task = new Task({
    description,
    expectedOutput: 'ONAYLANDI veya REVIZE GEREKLI: [madde listesi]',
    agent,
  });

  const crew = new Crew({
    agents: [agent],
    tasks: [task],
    process: Process.sequential,
  });

  const result = await crew.kickoff({ inputs: { input } });
  return result.raw;
}

function parseOutline(raw: string): { logline: string; theme: string; genre: string; characters: Array<{ name: string; age?: number; motivation: string; flaw: string }>; synopsis: string } {
  const logline = extractSection(raw, 'LOGLINE');
  const theme = extractSection(raw, 'TEMA');
  const genre = extractSection(raw, 'TUR');
  const synopsis = extractSection(raw, 'HIKAYE OZETI|SYNOPSIS');
  return { logline, theme, genre, characters: [], synopsis };
}

function parseScenePlan(raw: string): ScriptOutput['scenes'] {
  const scenes: ScriptOutput['scenes'] = [];
  const blocks = raw.split(/SAHNE\s+\d+/i).slice(1).filter((b): b is string => !!b);
  for (const block of blocks) {
    const durationMatch = block.match(/TAHMINI\s*SURE\s*[:]?\s*(\d+)/i);
    const durationSeconds = durationMatch ? Math.min(300, Math.max(3, parseInt(durationMatch[1]!, 10))) : 20;
    scenes.push({
      sceneNumber: scenes.length + 1,
      location: extractSection(block, 'MEKAN') || 'Bilinmiyor',
      timeOfDay: extractSection(block, 'ZAMAN') || 'GUNDUZ',
      interior: block.toLowerCase().includes('ic'),
      purpose: extractSection(block, 'SAHNE AMACI') || '',
      characters: (extractSection(block, 'BULUNAN KARAKTERLER') || '').split(',').map((c) => c.trim()).filter(Boolean),
      plot: extractSection(block, 'OLAY ORGUSU') || '',
      durationSeconds,
    });
  }
  return scenes;
}

function extractSection(text: string, label: string): string {
  if (!text) return '';
  const regex = new RegExp(`${label}\\s*[::]?\\s*(.+?)(?=\\n(?:[A-Z]{4,}\\s*[:]?|$))`, 'si');
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : '';
}
