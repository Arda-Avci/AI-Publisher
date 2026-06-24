import { describe, it, expect } from 'vitest';
import { getCrewaiGemini, crewaiLogger } from './services/crewai/index.js';
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
});
