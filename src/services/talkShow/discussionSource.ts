import { Logger } from '../../lib/logger.js';

export interface SportotoUtterance {
  speaker: string;
  text: string;
  match_id: number | null;
  sequence_order: number;
}

export interface SportotoDiscussion {
  title: string;
  sportoto_week: number;
  utterances: SportotoUtterance[];
  total_utterances: number;
}

export interface DiscussionSource {
  readonly name: string;
  fetchWeeklyDiscussion(week: number): Promise<SportotoDiscussion>;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const STUB_SPEAKERS = ['Moderator', 'Yorumcu', 'Futbolcu', 'Kumarbaz', 'TeknikDirektor'];
const STUB_TOPICS = [
  'Haftanın maçları ve şampiyonluk yarışı',
  'Derbi analizi ve kritik pozisyonlar',
  'Sürpriz sonuçlar ve çıkış yakalayan takımlar',
  'Küme düşme hattı ve transfer dedikoduları',
];

export class StubSource implements DiscussionSource {
  readonly name = 'stub';

  async fetchWeeklyDiscussion(week: number): Promise<SportotoDiscussion> {
    const seed = hashCode(`stub-week-${week}`);
    const topic = STUB_TOPICS[seed % STUB_TOPICS.length];
    const utteranceCount = 4 + (seed % 3);
    const utterances: SportotoUtterance[] = [];

    for (let i = 0; i < utteranceCount; i++) {
      const speaker = STUB_SPEAKERS[i % STUB_SPEAKERS.length] || 'Yorumcu';
      utterances.push({
        speaker,
        text: `${speaker} hafta ${week} hakkında yorum yapıyor: ${topic}. Bu maçta kritik anlar var.`,
        match_id: seed + i,
        sequence_order: i + 1,
      });
    }

    Logger.info(
      `[StubSource] Generated stub discussion for week ${week}: "${topic}" with ${utteranceCount} utterances`,
    );

    return {
      title: `Hafta ${week} Talk-Show: ${topic}`,
      sportoto_week: week,
      utterances,
      total_utterances: utteranceCount,
    };
  }
}
