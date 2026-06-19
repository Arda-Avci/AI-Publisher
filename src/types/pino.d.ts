declare module 'pino' {
  interface LoggerOptions {
    level?: string;
    transport?: {
      target: string;
      options?: Record<string, any>;
    };
    formatters?: {
      bindings?: () => Record<string, unknown>;
      log?: (obj: Record<string, unknown>) => Record<string, unknown>;
    };
    serializers?: {
      err?: any;
    };
    redact?: {
      paths: string[];
      censor: string;
    };
  }

  interface Logger {
    info(data: any, msg: string): void;
    warn(data: any, msg: string): void;
    error(data: any, msg: string): void;
    debug(data: any, msg: string): void;
  }

  interface PinoFn {
    (options?: LoggerOptions): Logger;
    stdSerializers: {
      err: any;
    };
  }

  const pino: PinoFn;
  export default pino;
}
