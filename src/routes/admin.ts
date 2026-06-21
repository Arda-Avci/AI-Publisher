import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { Logger } from '../lib/logger.js';
import { dockerHost } from '../lib/docker-host.js';
import os from 'os';

const router = Router();

router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const { search, offset = '0', limit = '50' } = req.query;
    let query =
      'SELECT id, username, is_admin, preferred_language, selected_theme, created_at, last_login_at FROM users';
    const params: any[] = [];

    if (search) {
      query += ' WHERE username LIKE $1';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const users = await db.all(query, params);
    const countResult = await db.get(
      'SELECT COUNT(*) as total FROM users' + (search ? ' WHERE username LIKE $1' : ''),
      search ? [`%${search}%`] : [],
    );
    const total = (countResult as any)?.total || 0;

    res.json({
      success: true,
      users,
      total,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    Logger.error('Failed to fetch users', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/toggle-admin', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [id]);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const current = user.is_admin === 1 || user.is_admin === true;
    await db.run('UPDATE users SET is_admin = ? WHERE id = ?', [current ? 0 : 1, id]);
    Logger.info(`Admin: user ${id} admin status toggled to ${!current}`);
    res.json({ success: true, isAdmin: !current });
  } catch (error) {
    Logger.error('Failed to toggle admin', error);
    res.status(500).json({ success: false, error: 'Failed to toggle admin' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.session!.userId) {
      res.status(400).json({ success: false, error: 'Cannot delete yourself' });
      return;
    }
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    await db.run('UPDATE video_jobs SET user_id = NULL WHERE user_id = ?', [id]);
    Logger.info(`Admin: user ${id} deleted`);
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete user', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalJobs, activeJobs, totalVideos] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM video_jobs'),
      db.get(
        "SELECT COUNT(*) as count FROM video_jobs WHERE status = 'processing' OR status = 'queued'",
      ),
      db.get(
        "SELECT COUNT(*) as count FROM video_jobs WHERE status = 'completed' AND final_filename IS NOT NULL",
      ),
    ]);
    res.json({
      success: true,
      stats: {
        totalUsers: (totalUsers as any)?.count || 0,
        totalJobs: (totalJobs as any)?.count || 0,
        activeJobs: (activeJobs as any)?.count || 0,
        totalVideos: (totalVideos as any)?.count || 0,
      },
    });
  } catch (error) {
    Logger.error('Failed to fetch stats', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

router.get('/system', async (req, res) => {
  try {
    const jobStats = await Promise.all([
      db.get("SELECT COUNT(*) as count FROM video_jobs WHERE status = 'processing'"),
      db.get("SELECT COUNT(*) as count FROM video_jobs WHERE status = 'queued'"),
      db.get("SELECT COUNT(*) as count FROM video_jobs WHERE status = 'completed'"),
      db.get("SELECT COUNT(*) as count FROM video_jobs WHERE status = 'failed'"),
    ]);

    const [activeJobs, queuedJobs, completedJobs, failedJobs] = jobStats.map(
      (r: any) => r?.count || 0,
    );

    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: `${os.type()} ${os.release()}`,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        dbConnections: 1,
        dockerConnected: !!process.env.DOCKER_HOST,
        activeJobs,
        queuedJobs,
        completedJobs,
        failedJobs,
      },
    });
  } catch (error) {
    Logger.error('Failed to get system info', error);
    res.status(500).json({ success: false, error: 'Failed to get system info' });
  }
});

export default router;
