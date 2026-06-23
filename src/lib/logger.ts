import pino from 'pino';
import { randomUUID } from 'crypto';

let correlationId = '';

export function setCorrelationId(id?: string) {
  correlationId = id || randomUUID();
}

export const pinoLogger: ReturnType<typeof pino> = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  formatters: {
    bindings() { return {}; },
    log(obj: Record<string, unknown>) {
      if (correlationId) { (obj as any).correlationId = correlationId; }
      return obj;
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'apiKey', 'password', 'token'],
    censor: '[REDACTED]',
  },
});

export class Logger {
  static info(msg: string, data?: any) { pinoLogger.info(data, msg); }
  static warn(msg: string, data?: any) { pinoLogger.warn(data, msg); }
  static error(msg: string, err?: any) { pinoLogger.error({ err }, msg); }
  static debug(msg: string, data?: any) { pinoLogger.debug(data, msg); }
}
