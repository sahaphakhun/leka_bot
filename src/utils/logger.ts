// Logger Utility - ระบบ logging

import { config } from './config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = config.nodeEnv === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  public error(message: string, meta?: any): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  public info(message: string, meta?: any): void {
    if (this.level >= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  }

  public debug(message: string, meta?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export const logger = new Logger();