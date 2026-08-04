import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

export function buildWinstonConfig(): WinstonModuleOptions {
  const consoleFormat = isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, stack }) => {
          const ctx = context ? `[${context as string}] ` : '';
          return `${timestamp as string} ${level} ${ctx}${message as string}${stack ? `\n${stack as string}` : ''}`;
        }),
      );

  const transports: winston.transport[] = [new winston.transports.Console()];

  if (isProd) {
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    );
  }

  return {
    level: process.env.LOG_LEVEL ?? 'info',
    transports,
  };
}
