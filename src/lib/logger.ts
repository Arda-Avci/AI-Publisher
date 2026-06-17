export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  static info(msg: string, data?: any) {
    console.log(`[${this.getTimestamp()}] [INFO] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
  }

  static warn(msg: string, data?: any) {
    console.warn(`[${this.getTimestamp()}] [WARN] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
  }

  static error(msg: string, err?: any) {
    const stack = err?.stack ? '\n' + err.stack : '';
    console.error(`[${this.getTimestamp()}] [ERROR] ${msg}: ${err?.message || err}${stack}`);
  }

  static debug(msg: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[${this.getTimestamp()}] [DEBUG] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`,
      );
    }
  }
}
