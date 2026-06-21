import { Application, RequestHandler } from 'express';

type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';

/**
 * Register Express route under original path AND /api/v1/ prefix.
 *
 * Example: registerRoute(app, 'post', '/create-job', handler)
 *   → POST /create-job  (original)
 *   → POST /api/v1/create-job  (alias)
 *
 * Skips double-registration if path already starts with /api/ or /health/.
 */
export function registerRoute(
  app: Application,
  method: Method,
  path: string,
  ...handlers: RequestHandler[]
): void {
  (app as any)[method](path, ...handlers);

  if (!path.startsWith('/api/') && !path.startsWith('/health')) {
    (app as any)[method](`/api/v1${path}`, ...handlers);
  }
}
