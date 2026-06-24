import { describe, it, expect } from 'vitest';
import { getCrewaiGemini, crewaiLogger, createOutlinerAgent, createSceneArchitectAgent, createScriptwriterAgent, createReviewerAgent } from './services/crewai/index.js';
import { ScriptOutputSchema, ReviewResultSchema } from './types/script.js';
import { Agent, Task, Crew, Process } from '@crewai-ts/core';

describe('CrewAI Core', () => {
  it('Agent olusturma', () => {
    const agent = new Agent({
      role: 'Test Agent',
      goal: 'Test',
      backstory: 'Test agent',
      llm: () => 'test output',
    });
    expect(agent.role).toBe('Test Agent');
  });

  it('Task olusturma', () => {
    const agent = new Agent({
      role: 'Test',
      goal: 'Test',
      backstory: 'Test',
      llm: () => 'test',
    });
    const task = new Task({
      description: 'Test task',
      expectedOutput: 'Test output',
      agent,
    });
    expect(task.description).toBe('Test task');
  });

  it('Crew olusturma', () => {
    const agent = new Agent({
      role: 'Test',
      goal: 'Test',
      backstory: 'Test',
      llm: () => 'test',
    });
    const task = new Task({
      description: 'Test',
      expectedOutput: 'Test',
      agent,
    });
    const crew = new Crew({
      agents: [agent],
      tasks: [task],
      process: Process.sequential,
    });
    expect(crew).toBeDefined();
  });

  it('Gemini provider uretimi', () => {
    const llm = getCrewaiGemini('gemini-2.5-flash');
    expect(llm).toBeDefined();
  });

  it('crewaiLogger calisiyor', () => {
    const log = crewaiLogger('TestAgent');
    expect(log.info).toBeDefined();
    expect(log.warn).toBeDefined();
    expect(log.error).toBeDefined();
  });

  it('Outliner agent olusturma', () => {
    const agent = createOutlinerAgent();
    expect(agent.role).toContain('Outliner');
    expect(agent.goal).toContain('LOGLINE');
  });

  it('SceneArchitect agent olusturma', () => {
    const agent = createSceneArchitectAgent();
    expect(agent.role).toContain('Scene Architect');
    expect(agent.goal).toContain('SAHNE');
  });

  it('Scriptwriter agent olusturma', () => {
    const agent = createScriptwriterAgent();
    expect(agent.role).toContain('Scriptwriter');
    expect(agent.goal).toContain('IC/DIS');
  });

  it('Reviewer agent olusturma', () => {
    const agent = createReviewerAgent();
    expect(agent.role).toContain('Reviewer');
    expect(agent.goal).toContain('ONAYLANDI');
  });

  it('ScriptOutputSchema gecerli veriyi dogrular', () => {
    const data = {
      logline: 'Test logline',
      theme: 'Test tema',
      genre: 'Dram',
      characters: [{ name: 'Ali', age: 30, motivation: 'Intikam', flaw: 'Kibir' }],
      synopsis: '3 perdeli ozet',
      scenes: [{ sceneNumber: 1, location: 'Ev', timeOfDay: 'Gece', interior: true, purpose: 'Tanitim', characters: ['Ali'], plot: 'Ali eve gelir' }],
      fullScript: 'IC - EV - GECE\nAli iceri girer.',
      revisionCount: 0,
      status: 'approved',
    };
    const parsed = ScriptOutputSchema.parse(data);
    expect(parsed.logline).toBe('Test logline');
    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.status).toBe('approved');
  });

  it('ScriptOutputSchema gecersiz veriyi reddeder', () => {
    expect(() => ScriptOutputSchema.parse({})).toThrow();
    expect(() => ScriptOutputSchema.parse({ logline: 'test', status: 'invalid' })).toThrow();
  });

  it('ReviewResultSchema dogrulama', () => {
    const approved = ReviewResultSchema.parse({ approved: true });
    expect(approved.approved).toBe(true);

    const rejected = ReviewResultSchema.parse({ approved: false, issues: ['Zayif diyalog'], feedback: 'Duzelt' });
    expect(rejected.issues).toHaveLength(1);
  });

  it('runWriterPipeline fonksiyonu tanimli', async () => {
    const { runWriterPipeline } = await import('./services/crewai/index.js');
    expect(runWriterPipeline).toBeDefined();
    expect(typeof runWriterPipeline).toBe('function');
  });
});
