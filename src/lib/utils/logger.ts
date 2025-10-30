export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private formatLog(entry: LogEntry): string {
    const contextStr = entry.context ? JSON.stringify(entry.context, null, 2) : '';
    const errorStr = entry.error ? `\n${entry.error.stack}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr ? `\n${contextStr}` : ''}${errorStr}`;
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.isDevelopment) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    console.debug(this.formatLog(entry));
  }

  info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    console.info(this.formatLog(entry));
  }

  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    console.warn(this.formatLog(entry));
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    console.error(this.formatLog(entry));
  }

  apiCall(platform: string, endpoint: string, method: string, status?: number): void {
    this.debug(`API Call: ${platform}`, {
      endpoint,
      method,
      status,
    });
  }

  syncStart(platform: string, connectionId: string, syncType: string): void {
    this.info(`Sync started: ${platform}`, {
      connectionId,
      syncType,
    });
  }

  syncComplete(platform: string, connectionId: string, recordsSynced: Record<string, number>, duration: number): void {
    this.info(`Sync completed: ${platform}`, {
      connectionId,
      recordsSynced,
      durationSeconds: duration,
    });
  }

  syncError(platform: string, connectionId: string, error: Error): void {
    this.error(`Sync failed: ${platform}`, error, {
      connectionId,
    });
  }

  tokenRefresh(platform: string, success: boolean, attempts: number): void {
    if (success) {
      this.info(`Token refreshed: ${platform}`, { attempts });
    } else {
      this.error(`Token refresh failed: ${platform}`, undefined, { attempts });
    }
  }
}

export const logger = new Logger();
