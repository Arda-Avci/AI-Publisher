import { Agent } from '@crewai-ts/core';
import { getCrewaiGemini, crewaiLogger } from './crewaiService.js';
import type { ArtStylePreset } from '../artStylePresets.js';
import { buildStylePrompt } from '../artStylePresets.js';

const log = crewaiLogger('Outliner');

export function createOutlinerAgent(artStyle?: ArtStylePreset): Agent {
  log.info('Outliner agent olusturuluyor' + (artStyle ? ` (stil: ${artStyle.name})` : ''));

  const styleBlock = artStyle ? `\n\nGORSEL STIL:\n${buildStylePrompt(artStyle)}\n\nSenaryo goruntuleme stili yukardaki gibi. Hikayeni ve karakterlerini bu gorsel stile uygun sekilde kurgula. Sahne tanimlarinda bu stil ipuclarini kullan.` : '';

  return new Agent({
    role: 'Konsept ve Karakter Gelistirici (Outliner)',
    goal:
      'Kullanici fikrini al, derinlikli sinema konseptine donustur. ' +
      'LOGLINE, TEMA/TUR, KARAKTERLER (motivasyon+zaaf), 3-perdelik SYNOPSIS cikar.' +
      styleBlock,
    backstory:
      'Oscarii bir Hollywood hikaye gelistiricisisin (Story Editor). ' +
      '20 yillik deneyiminle basit fikirleri epik senaryolara donusturuyorsun. ' +
      'Her karakterin psikolojik derinligi, her sahnenin bir amaci olmali.',
    llm: getCrewaiGemini('gemini-2.5-flash'),
  });
}
