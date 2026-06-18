import { StoryboardResult, StoryboardOptions } from './types.js';
type ProgressCallback = (stage: string, percent: number) => void;
export declare function runStoryboardAgent(options: StoryboardOptions, onProgress?: ProgressCallback): Promise<StoryboardResult>;
export declare function integrateWithJob(job: any, onProgress?: ProgressCallback): Promise<StoryboardResult>;
export {};
//# sourceMappingURL=storyboardAgent.d.ts.map