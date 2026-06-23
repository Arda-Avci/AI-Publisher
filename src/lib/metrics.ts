import {
  recordJobDuration,
  incrementSceneCounter,
  recordRenderTime,
  jobStarted,
  jobFinished,
  incrementFailedJobs,
} from './telemetry.js';

const jobStartTimes = new Map<number | string, number>();

export function trackJobStart(jobId: number | string, attrs?: Record<string, string>) {
  jobStartTimes.set(jobId, Date.now());
  jobStarted();
}

export function trackJobEnd(jobId: number | string, attrs?: Record<string, string>) {
  const start = jobStartTimes.get(jobId);
  if (start) {
    const duration = (Date.now() - start) / 1000;
    recordJobDuration(duration, attrs);
    jobStartTimes.delete(jobId);
  }
  jobFinished();
}

export function trackJobFailed(jobId: number | string, attrs?: Record<string, string>) {
  trackJobEnd(jobId, attrs);
  incrementFailedJobs(attrs);
}

export function trackSceneRendered(modelName: string, durationMs: number) {
  incrementSceneCounter({ model: modelName });
  recordRenderTime(durationMs / 1000, { model: modelName });
}

// Queue depth tracked externally via /metrics endpoint
