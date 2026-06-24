import { Agent } from '@crewai-ts/core';
import { getCrewaiGemini, crewaiLogger } from './crewaiService.js';

const log = crewaiLogger('Outliner');

export function createOutlinerAgent(): Agent {
  log.info('Outliner agent olusturuluyor');

  return new Agent({
    role: 'Konsept ve Karakter Gelistirici (Outliner)',
    goal:
      'Kullanici fikrini al, derinlikli sinema konseptine donustur. ' +
      'LOGLINE, TEMA/TUR, KARAKTERLER (motivasyon+zaaf), 3-perdelik SYNOPSIS cikar.',
    backstory:
      'Oscarii bir Hollywood hikaye gelistiricisisin (Story Editor). ' +
      '20 yillik deneyiminle basit fikirleri epik senaryolara donusturuyorsun. ' +
      'Her karakterin psikolojik derinligi, her sahnenin bir amaci olmali.',
    llm: getCrewaiGemini('gemini-2.5-flash'),
  });
}
