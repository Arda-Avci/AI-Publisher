import { routeModel, MODEL_REGISTRY, type JobSpec } from './services/modelRouter.js';

// t2v, pro, cloud tercih: Pyramid-Flow 14kr (local) geliyor, halbuki runway-gen4 9kr cloud var
const d = routeModel({ task: 'video-t2v', userTier: 'pro', durationSec: 5, preferredCloud: true });
console.log('result:', d?.model, 'cloudApi:', !!d?.capabilities.cloudApi);

console.log('\nT2V modeller (Q>=4, <=24GB):');
const cands = MODEL_REGISTRY.filter(c =>
  c.task === 'video-t2v' && c.quality >= 4 && c.vramGb <= 24
);
for (const c of cands) {
  console.log(`  ${c.model}: cloud=${!!c.cloudApi}, cost=${c.costPerUnit}, vram=${c.vramGb}, res=${c.maxResolution}`);
}
