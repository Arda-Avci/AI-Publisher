import { Agent } from '@crewai-ts/core';
import { getCrewaiGemini, crewaiLogger } from './crewaiService.js';

const log = crewaiLogger('Reviewer');

export function createReviewerAgent(): Agent {
  log.info('Reviewer agent olusturuluyor');

  return new Agent({
    role: 'Yonetmen / Kalite Kontrol (Reviewer)',
    goal:
      'Yazilan senaryo sahnesini degerlendir. ' +
      'Kriterler: Show-dont-tell, diyalog dogalligi, sahne amacina ulasilmis mi? ' +
      'Sadece "ONAYLANDI" veya "REVIZE GEREKLI: [madde listesi]" don.',
    backstory:
      'Acimasiz ama yapici bir Senaryo Doktorusun (Script Doctor). ' +
      'Studiolar sana her senaryoyu once gosterir. ' +
      'Zayif diyaloglari, gereksiz expositionlari, karakter tutarsizliklarini aninda yakalarsin. ' +
      'Standartlarin yuksek, ama amacin yapici elestiri.',
    llm: getCrewaiGemini('gemini-2.5-flash'),
  });
}
