export { runEditingTheoryCheck, type EditingScore } from './editingTheoryAgent.js';
export { suggestAuteurStyle, type AuteurStyle, type AuteurSuggestion } from './auteurSignatureAgent.js';
export { suggestNarrativeDevice, type NarrativeDevice, type NarrativeSuggestion } from './narrativeDeviceAgent.js';
export { suggestTimeStructure, type TimeStructure, type TimeStructureSuggestion } from './timeStructureAgent.js';
export { designTransitions, type Transition, type TransitionPlan } from './transitionDesignerAgent.js';
export { injectCharacterReferences, type CharacterRefResult } from './characterReferenceService.js';
export { runFilmStoryboard, type FilmStoryboardResult } from './storyboardIntegration.js';

export {
  validateScenes,
  checkTimelineConsistency,
  type CanonValidation,
  type CanonIssue,
  type ExtractedEntity,
} from './canonAuditor.js';

export {
  analyzePlantPayoff,
  trackCharacterState,
  getCharacterTimeline,
  verifyObjectContinuity,
  type PlantPayoff,
  type CharacterState,
} from './continuityManager.js';

export {
  analyzeSceneRelationships,
  getRelationshipArc,
  suggestSlowBurnBeat,
  type RelationshipEdge,
  type RelationshipBeat,
} from './characterPsychologist.js';

export {
  createPostProductionPlan,
  type PostProductionPlan,
} from './postProductionAgent.js';

export {
  planSoundDesign,
  type SoundDesignPlan,
  type ADRLine,
  type FoleyEffect,
  type RoomTone,
  type SoundBridge,
} from './soundDesigner.js';

export { analyzeTemporalSync, type TemporalEvent, type TemporalPlan } from './temporalSync.js';
