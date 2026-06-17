/**
 * Canvas Service Types
 * Infinite Canvas, Smart Caching, Task Controls, Schedule Publishing
 */

// Node types for the infinite canvas
export type CanvasNodeType =
  | 'text'
  | 'image'
  | 'video'
  | 'character'
  | 'storyboard'
  | 'keyframe'
  | 'audio'
  | 'subtitle';

export type NodeStatus = 'draft' | 'pending' | 'generating' | 'completed' | 'failed';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: Record<string, unknown>;
  status: NodeStatus;
  dependencies: string[]; // IDs of nodes this node depends on
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

export interface CanvasSnapshot {
  id: string;
  canvasId: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewportX: number;
  viewportY: number;
  viewportScale: number;
  createdAt: Date;
}

export interface Canvas {
  id: string;
  userId: number;
  name: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  createdAt: Date;
  updatedAt: Date;
}

// Task Control types
export type TaskType = 'generate' | 'process' | 'upload' | 'download' | 'compose';

export interface Task {
  id: string;
  type: TaskType;
  nodeId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  result?: unknown;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskQueue {
  id: string;
  tasks: Task[];
  isProcessing: boolean;
}

// Schedule Publishing types
export interface SchedulePublishJob {
  id: string;
  videoId: number;
  platform: 'youtube' | 'tiktok' | 'x' | 'meta';
  scheduledTime: Date;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  publishResult?: Record<string, unknown>;
  createdAt: Date;
  publishedAt?: Date;
}

export interface PublishSchedule {
  id: string;
  userId: number;
  jobs: SchedulePublishJob[];
  dailyLimit: number; // Max videos per day
  usedToday: number;
}
