import winston from 'winston';
import { AppConfig } from '../config/app.config';

export class Logger {
  private static instance: winston.Logger;

  private constructor() {}

  static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.createLogger();
    }
    return Logger.instance;
  }

  private static createLogger(): winston.Logger {
    const logLevel = AppConfig.logLevel;
    const isDevelopment = AppConfig.isDevelopment;

    const formats = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ];

    if (isDevelopment) {
      formats.push(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          const msg = stack || message;
          return `${timestamp} [${level}]: ${msg}`;
        })
      );
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(...formats),
      }),
    ];

    // Add file transports for production
    if (!isDevelopment) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false,
    });
  }

  static debug(message: string, meta?: any): void {
    Logger.getInstance().debug(message, meta);
  }

  static info(message: string, meta?: any): void {
    Logger.getInstance().info(message, meta);
  }

  static warn(message: string, meta?: any): void {
    Logger.getInstance().warn(message, meta);
  }

  static error(message: string, error?: any): void {
    Logger.getInstance().error(message, error);
  }

  static http(message: string, meta?: any): void {
    Logger.getInstance().http(message, meta);
  }

  static verbose(message: string, meta?: any): void {
    Logger.getInstance().verbose(message, meta);
  }

  static silly(message: string, meta?: any): void {
    Logger.getInstance().silly(message, meta);
  }
} 