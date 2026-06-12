import express, { Application, Request, Response } from 'express';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { colab } from '../lib/colab-manager.js';
import { getAIModelChain } from '../lib/ai-provider.js';
import { generateText } from 'ai';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

const MCP_TOOLS: MCPTool[] = [
  {
    name: 'list_jobs',
    description: 'List all video jobs with their status and progress',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status (pending/processing/completed/failed)' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'get_job_details',
    description: 'Get detailed information about a specific video job',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'number', description: 'Job ID' },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'get_colab_status',
    description: 'Check the current Colab server status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_broll',
    description: 'List all generated B-roll files in the uploads directory',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_job_progress',
    description: 'Get real-time progress of a job including current stage and percent',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'number', description: 'Job ID' },
      },
      required: ['jobId'],
    },
  },
];

async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'list_jobs': {
      const { status, limit = 10 } = args;
      let query = 'SELECT id, master_prompt, status, current_stage, progress_percent, total_scenes, completed_scenes, created_at FROM video_jobs';
      const params: any[] = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY id DESC LIMIT ?';
      params.push(limit);

      const jobs = await db.all(query, params);
      return { success: true, data: jobs };
    }

    case 'get_job_details': {
      const { jobId } = args;
      const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
      if (!job) return { success: false, error: 'Job not found' };
      return { success: true, data: job };
    }

    case 'get_colab_status': {
      try {
        const state = colab.getState();
        return { success: true, data: { state, url: process.env.COLAB_URL || 'N/A' } };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'list_broll': {
      const fs = await import('fs-extra');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!await fs.pathExists(uploadsDir)) return { success: true, data: [] };
      const files = await fs.readdir(uploadsDir);
      const bRollFiles = files
        .filter((f: string) => f.startsWith('broll_') && f.endsWith('.mp4'))
        .map((f: string) => ({ filename: f, url: `/uploads/${f}` }));
      return { success: true, data: bRollFiles };
    }

    case 'get_job_progress': {
      const { jobId } = args;
      const job = await db.get(
        'SELECT id, status, current_stage, progress_percent, total_scenes, completed_scenes FROM video_jobs WHERE id = ?',
        [jobId]
      );
      if (!job) return { success: false, error: 'Job not found' };
      return { success: true, data: job };
    }

    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

export function createMCPServer(): Application {
  const mcpApp = express();
  mcpApp.use(express.json());

  mcpApp.get('/mcp/v1/tools', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: MCP_TOOLS,
    });
  });

  mcpApp.post('/mcp/v1/execute', async (req: Request, res: Response) => {
    try {
      const { tool, args } = req.body;
      if (!tool) {
        return res.status(400).json({ success: false, error: 'Tool name required' });
      }

      Logger.info(`[MCP] Executing tool: ${tool}`, args);
      const result = await executeTool(tool, args || {});
      res.json(result);
    } catch (err: any) {
      Logger.error('[MCP] Execution error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  mcpApp.post('/mcp/v1/chat', async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: 'Message required' });
      }

      const models = getAIModelChain();
      const model = models[0];

      const systemPrompt = `Sen AI-Publisher sisteminin MCP (Model Context Protocol) ajanısın.
Kullanıcının isteğini analiz edip uygun MCP tool'larını kullanarak yanıt üretiyorsun.
Mevcut tool'lar: ${MCP_TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n')}`;

      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: message,
        abortSignal: AbortSignal.timeout(30000),
      });

      res.json({ success: true, data: { response: result.text } });
    } catch (err: any) {
      Logger.error('[MCP] Chat error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return mcpApp;
}

export async function startMCPServer(port: number = 3099): Promise<void> {
  const mcpApp = createMCPServer();
  return new Promise((resolve) => {
    mcpApp.listen(port, () => {
      Logger.info(`[MCP] Server running on port ${port}`);
      resolve();
    });
  });
}
