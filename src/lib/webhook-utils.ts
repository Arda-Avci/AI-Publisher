export function extractUrls(output: any): {
  videoUrl: string;
  speechUrl: string;
  sfxUrl: string;
  subtitleUrl: string;
  images?: string[];
} {
  let videoUrl = '';

  if (typeof output === 'string') {
    if (output.endsWith('.mp4') || output.endsWith('.webm') || output.endsWith('.mkv') || output.endsWith('.avi')) {
      videoUrl = output;
    }
    return { videoUrl, speechUrl: '', sfxUrl: '', subtitleUrl: '' };
  }

  if (!output || typeof output !== 'object') {
    return { videoUrl, speechUrl: '', sfxUrl: '', subtitleUrl: '' };
  }

  const fields = [
    'video_url',
    'videoUrl',
    'output_video',
    'final_video',
    'result_video',
  ];

  for (const field of fields) {
    if (output[field] && typeof output[field] === 'string') {
      videoUrl = output[field];
      break;
    }
  }

  if (!videoUrl && output.b2_urls) {
    const b2Paths = [
      '/content/current_scene.mp4',
      '/content/raw_video.mp4',
      '/content/final_scene.mp4',
      '/workspace/current_scene.mp4',
      '/workspace/raw_video.mp4',
      '/workspace/final_scene.mp4',
    ];
    for (const p of b2Paths) {
      if (output.b2_urls[p]) {
        videoUrl = output.b2_urls[p];
        break;
      }
    }
  }

  if (!videoUrl && output.video) {
    const v = output.video;
    if (typeof v === 'string') videoUrl = v;
    else if (v.url) videoUrl = v.url;
    else if (v.path && output.b2_urls?.[v.path]) videoUrl = output.b2_urls[v.path];
  }

  if (!videoUrl && output.images) {
    for (const key of Object.keys(output.images)) {
      const files = output.images[key];
      if (Array.isArray(files) && files.length > 0) {
        const file = files[0];
        if (typeof file === 'string' && (file.endsWith('.mp4') || file.endsWith('.mkv') || file.endsWith('.avi') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))) {
          videoUrl = file;
          break;
        }
      }
    }
  }

  let speechUrl = '';

  const speechFields = ['speech_url', 'speechUrl', 'audio_url', 'audioUrl', 'output_audio'];
  for (const field of speechFields) {
    if (output[field] && typeof output[field] === 'string') {
      speechUrl = output[field];
      break;
    }
  }

  if (!speechUrl && output.b2_urls) {
    const audioPaths = [
      '/content/speech.wav',
      '/content/kokoro_speech.wav',
      '/content/audio.wav',
      '/workspace/speech.wav',
      '/workspace/audio.wav',
    ];
    for (const p of audioPaths) {
      if (output.b2_urls[p]) {
        speechUrl = output.b2_urls[p];
        break;
      }
    }
  }

  let sfxUrl = output.sfx_url || (output.b2_urls?.['/content/sfx.wav']) || (output.b2_urls?.['/workspace/sfx.wav']) || '';

  let subtitleUrl = output.subtitle_url ||
    output.subtitleUrl ||
    (output.b2_urls?.['/content/subtitle.srt']) ||
    (output.b2_urls?.['/workspace/subtitle.srt']) ||
    output.subtitles ||
    '';

  if (Array.isArray(output.subtitle_url)) {
    subtitleUrl = output.subtitle_url[0] || '';
  }

  const images: string[] = [];
  if (output.images) {
    if (Array.isArray(output.images)) {
      images.push(...output.images.filter((i: any) => typeof i === 'string'));
    } else if (typeof output.images === 'object') {
      for (const key of Object.keys(output.images)) {
        const files = output.images[key];
        if (Array.isArray(files)) {
          images.push(...files.filter((f: any) => typeof f === 'string' && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))));
        }
      }
    }
  }
  if (output.image_url) images.push(output.image_url);
  if (output.output_images) {
    if (Array.isArray(output.output_images)) images.push(...output.output_images);
  }

  return { videoUrl, speechUrl, sfxUrl, subtitleUrl, images: images.length > 0 ? images : undefined };
}
