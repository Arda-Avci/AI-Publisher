import { describe, it, expect } from 'vitest';
import { extractUrls } from './lib/webhook-utils.js';

describe('extractUrls', () => {
  it('video_url from direct field', () => {
    const output = { video_url: 'https://b2.example.com/video.mp4' };
    const { videoUrl } = extractUrls(output);
    expect(videoUrl).toBe('https://b2.example.com/video.mp4');
  });

  it('video_url from b2_urls current_scene', () => {
    const output = { b2_urls: { '/content/current_scene.mp4': 'https://b2.example.com/scene.mp4' } };
    const { videoUrl } = extractUrls(output);
    expect(videoUrl).toBe('https://b2.example.com/scene.mp4');
  });

  it('video_url from b2_urls raw_video fallback', () => {
    const output = { b2_urls: { '/content/raw_video.mp4': 'https://b2.example.com/raw.mp4' } };
    const { videoUrl } = extractUrls(output);
    expect(videoUrl).toBe('https://b2.example.com/raw.mp4');
  });

  it('video_url from images array', () => {
    const output = { images: { '0': ['https://b2.example.com/scene.mp4'] } };
    const { videoUrl } = extractUrls(output);
    expect(videoUrl).toBe('https://b2.example.com/scene.mp4');
  });

  it('video_url empty when no match', () => {
    const output = { some_other_field: 'data' };
    const { videoUrl } = extractUrls(output);
    expect(videoUrl).toBe('');
  });

  it('speech_url from direct field', () => {
    const output = { speech_url: 'https://b2.example.com/speech.wav' };
    const { speechUrl } = extractUrls(output);
    expect(speechUrl).toBe('https://b2.example.com/speech.wav');
  });

  it('speech_url from b2_urls kokoro fallback', () => {
    const output = { b2_urls: { '/content/kokoro_speech.wav': 'https://b2.example.com/kokoro.wav' } };
    const { speechUrl } = extractUrls(output);
    expect(speechUrl).toBe('https://b2.example.com/kokoro.wav');
  });

  it('sfx_url from b2_urls', () => {
    const output = { b2_urls: { '/content/sfx.wav': 'https://b2.example.com/sfx.wav' } };
    const { sfxUrl } = extractUrls(output);
    expect(sfxUrl).toBe('https://b2.example.com/sfx.wav');
  });

  it('subtitle_url from direct field', () => {
    const output = { subtitle_url: 'https://b2.example.com/sub.srt' };
    const { subtitleUrl } = extractUrls(output);
    expect(subtitleUrl).toBe('https://b2.example.com/sub.srt');
  });

  it('all urls extracted correctly from full payload', () => {
    const output = {
      video_url: 'https://b2.example.com/v.mp4',
      speech_url: 'https://b2.example.com/s.wav',
      sfx_url: 'https://b2.example.com/fx.wav',
      subtitle_url: 'https://b2.example.com/sub.srt',
    };
    const urls = extractUrls(output);
    expect(urls.videoUrl).toBe('https://b2.example.com/v.mp4');
    expect(urls.speechUrl).toBe('https://b2.example.com/s.wav');
    expect(urls.sfxUrl).toBe('https://b2.example.com/fx.wav');
    expect(urls.subtitleUrl).toBe('https://b2.example.com/sub.srt');
  });
});
