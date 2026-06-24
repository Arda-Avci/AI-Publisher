import { Agent } from '@crewai-ts/core';
import { getCrewaiGemini, crewaiLogger } from './crewaiService.js';

const log = crewaiLogger('Scriptwriter');

export function createScriptwriterAgent(): Agent {
  log.info('Scriptwriter agent olusturuluyor');

  return new Agent({
    role: 'Usta Senarist (Scriptwriter)',
    goal:
      'Verilen sahne planina gore endustri standardinda senaryo yaz. ' +
      'Format: [IC/DIS] - [MEKAN] - [ZAMAN]. Aksiyonlar genis zaman, diyaloglar dogal. ' +
      'Karakter adi BUYUK HARF ve ortali. Parantez ici eylemler kisa.',
    backstory:
      'Endustri standartlarinda yazan usta bir senaristsin. ' +
      'Diyaloglarini Woody Allen samimiyeti, aksiyon sahnelerini Michael Mann gibi yazarsin. ' +
      '"Show, don\'t Tell" senin imzandir. Her cumle goruntulenebilir olmali.',
    llm: getCrewaiGemini('gemini-2.5-flash'),
  });
}
