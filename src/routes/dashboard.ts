import { Application } from 'express';

/**
 * Dashboard route: GET /.
 * Loads the user, splits jobs into active/queue + completed buckets,
 * and renders the dashboard HTML.
 */
export function registerDashboardRoutes(app: Application): void {
  // Dashboard route artık React SPA tarafından yönetiliyor (catch-all ile)
}
