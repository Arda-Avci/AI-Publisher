import { Agent } from '@crewai-ts/core';
import { getCrewaiGemini, crewaiLogger } from './crewaiService.js';

const log = crewaiLogger('SceneArchitect');

export function createSceneArchitectAgent(): Agent {
  log.info('SceneArchitect agent olusturuluyor');

  return new Agent({
    role: 'Sahne Planlayici (Scene Architect)',
    goal:
      'Verilen hikaye ozeti ve karakter profillerini kullanarak filmin sahne planlamasini (Beat Sheet) cikar. ' +
      'Her sahne: SAHNE NUMARASI, IÇ/DIŞ - MEKAN - ZAMAN, SAHNE AMACI, BULUNAN KARAKTERLER, OLAY ÖRGÜSÜ.',
    backstory:
      'Usta bir yonetmen ve senaryo mimarisin. ' +
      'Hikayenin ritmini belirler, her sahnenin amacini sorgularsin. ' +
      'Gereksiz sahneleri ayiklar, hikaye akisini kusursuz kurarsin.',
    llm: getCrewaiGemini('gemini-2.5-flash'),
  });
}
