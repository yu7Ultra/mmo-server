import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ENV } from './env';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
if (ENV.LOG_TO_FILE && !fs.existsSync(ENV.LOG_DIR)) {
  fs.mkdirSync(ENV.LOG_DIR, { recursive: true });
}

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 定义日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 添加颜色到 winston
winston.addColors(colors);

// 定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      let logMessage = `${timestamp} ${level}: ${message}`;
      
      // 如果有元数据，将其转换为字符串并附加
      if (Object.keys(meta).length > 0) {
        // 过滤掉内部属性，如 symbol 等
        const cleanMeta = Object.keys(meta).reduce((acc, key) => {
          if (key !== 'symbol' && key !== 'level' && key !== 'message' && key !== 'timestamp') {
            acc[key] = meta[key];
          }
          return acc;
        }, {} as any);
        
        if (Object.keys(cleanMeta).length > 0) {
          logMessage += ` ${JSON.stringify(cleanMeta)}`;
        }
      }
      
      return logMessage;
    },
  ),
);

// 定义文件日志格式（不包含颜色）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// 定义传输器
const transports: winston.transport[] = [];

// 添加控制台输出
if (ENV.LOG_TO_CONSOLE) {
  transports.push(
    new winston.transports.Console({
      format,
      level: ENV.LOG_LEVEL,
    })
  );
}

// 添加文件输出
if (ENV.LOG_TO_FILE) {
  // 错误日志文件
  transports.push(
    new DailyRotateFile({
      filename: path.join(ENV.LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: ENV.LOG_FILE_MAX_SIZE,
      maxFiles: ENV.LOG_FILE_MAX_FILES,
      zippedArchive: true,
    })
  );
  
  // 组合日志文件
  transports.push(
    new DailyRotateFile({
      filename: path.join(ENV.LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: ENV.LOG_FILE_MAX_SIZE,
      maxFiles: ENV.LOG_FILE_MAX_FILES,
      zippedArchive: true,
    })
  );
}

// 创建 logger 实例
const logger = winston.createLogger({
  level: ENV.LOG_LEVEL,
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// 创建流对象供 Morgan 使用
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;