import { loggerService } from '../services/loggerService';

/**
 * 测试 winston 日志功能
 */
export function testLogger() {
  console.log('开始测试 winston 日志功能...');
  
  // 测试基本日志级别
  loggerService.debug('这是一条调试信息', { test: true });
  loggerService.info('这是一条信息日志', { test: true });
  loggerService.warn('这是一条警告日志', { test: true });
  loggerService.error('这是一条错误日志', new Error('测试错误'), { test: true });
  
  // 测试专用日志方法
  loggerService.playerAction('player123', 'login', { ip: '127.0.0.1' });
  loggerService.roomAction('room456', 'create', { maxPlayers: 10 });
  loggerService.performance('tickTime', 15.5, { roomId: 'room456' });
  loggerService.security('invalid_token', 'medium', { ip: '127.0.0.1', userAgent: 'test-agent' });
  loggerService.combat('player123', 'monster456', 'attack', { damage: 25 });
  loggerService.chat('player123', 'Hello world!', 'global');
  
  // 测试子日志器
  const roomLogger = loggerService.child('RoomSystem');
  roomLogger.info('房间系统初始化完成');
  roomLogger.playerAction('player789', 'join', { roomId: 'room456' });
  
  console.log('winston 日志功能测试完成！');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testLogger();
}