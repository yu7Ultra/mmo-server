import logger from '../config/loggerConfig';

/**
 * 日志服务类，提供统一的日志接口
 */
export class LoggerService {
  private static instance: LoggerService;
  private winston = logger;

  private constructor() {}

  /**
   * 获取日志服务单例实例
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * 记录错误日志
   * @param message 错误消息
   * @param error 错误对象（可选）
   * @param meta 附加元数据（可选）
   */
  public error(message: string, error?: Error, meta?: any): void {
    const logData = {
      message,
      ...(error && { error: error.stack || error.message }),
      ...meta,
    };
    this.winston.error(logData);
  }

  /**
   * 记录警告日志
   * @param message 警告消息
   * @param meta 附加元数据（可选）
   */
  public warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  /**
   * 记录信息日志
   * @param message 信息消息
   * @param meta 附加元数据（可选）
   */
  public info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  /**
   * 记录 HTTP 请求日志
   * @param message HTTP 请求消息
   * @param meta 附加元数据（可选）
   */
  public http(message: string, meta?: any): void {
    this.winston.http(message, meta);
  }

  /**
   * 记录调试日志
   * @param message 调试消息
   * @param meta 附加元数据（可选）
   */
  public debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  /**
   * 记录玩家相关日志
   * @param playerId 玩家ID
   * @param action 动作
   * @param details 详细信息（可选）
   */
  public playerAction(playerId: string, action: string, details?: any): void {
    this.info(`Player Action: ${action}`, {
      playerId,
      action,
      ...details,
    });
  }

  /**
   * 记录房间相关日志
   * @param roomId 房间ID
   * @param action 动作
   * @param details 详细信息（可选）
   */
  public roomAction(roomId: string, action: string, details?: any): void {
    this.info(`Room Action: ${action}`, {
      roomId,
      action,
      ...details,
    });
  }

  /**
   * 记录系统性能日志
   * @param metric 指标名称
   * @param value 指标值
   * @param details 详细信息（可选）
   */
  public performance(metric: string, value: number, details?: any): void {
    this.info(`Performance: ${metric}`, {
      metric,
      value,
      ...details,
    });
  }

  /**
   * 记录安全相关日志
   * @param event 安全事件
   * @param severity 严重程度
   * @param details 详细信息（可选）
   */
  public security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.winston[level](`Security Event: ${event}`, {
      event,
      severity,
      ...details,
    });
  }

  /**
   * 记录战斗相关日志
   * @param attackerId 攻击者ID
   * @param targetId 目标ID
   * @param action 战斗动作
   * @param details 详细信息（可选）
   */
  public combat(attackerId: string, targetId: string, action: string, details?: any): void {
    this.info(`Combat: ${action}`, {
      attackerId,
      targetId,
      action,
      ...details,
    });
  }

  /**
   * 记录聊天消息日志
   * @param playerId 玩家ID
   * @param message 消息内容
   * @param channel 频道（可选）
   * @param details 详细信息（可选）
   */
  public chat(playerId: string, message: string, channel?: string, details?: any): void {
    this.info(`Chat Message`, {
      playerId,
      message,
      channel,
      ...details,
    });
  }

  /**
   * 创建子日志器
   * @param module 模块名称
   * @returns 子日志器
   */
  public child(module: string): LoggerService {
    const childLogger = {
      error: (message: string, error?: Error, meta?: any) => 
        this.error(`[${module}] ${message}`, error, meta),
      warn: (message: string, meta?: any) => 
        this.warn(`[${module}] ${message}`, meta),
      info: (message: string, meta?: any) => 
        this.info(`[${module}] ${message}`, meta),
      http: (message: string, meta?: any) => 
        this.http(`[${module}] ${message}`, meta),
      debug: (message: string, meta?: any) => 
        this.debug(`[${module}] ${message}`, meta),
      playerAction: (playerId: string, action: string, details?: any) => 
        this.playerAction(playerId, action, { module, ...details }),
      roomAction: (roomId: string, action: string, details?: any) => 
        this.roomAction(roomId, action, { module, ...details }),
      performance: (metric: string, value: number, details?: any) => 
        this.performance(metric, value, { module, ...details }),
      security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => 
        this.security(event, severity, { module, ...details }),
      combat: (attackerId: string, targetId: string, action: string, details?: any) => 
        this.combat(attackerId, targetId, action, { module, ...details }),
      chat: (playerId: string, message: string, channel?: string, details?: any) => 
        this.chat(playerId, message, channel, { module, ...details }),
    };

    return childLogger as LoggerService;
  }
}

// 导出默认实例
export const loggerService = LoggerService.getInstance();

// 导出流对象供中间件使用
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};