type Level = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

function log(level: Level, service: string, msg: string, ctx?: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    msg,
    ...ctx,
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

export type Logger = {
  debug: (msg: string, ctx?: LogContext) => void;
  info: (msg: string, ctx?: LogContext) => void;
  warn: (msg: string, ctx?: LogContext) => void;
  error: (msg: string, ctx?: LogContext) => void;
};

export function createLogger(service: string): Logger {
  return {
    debug: (msg: string, ctx?: LogContext) => log('debug', service, msg, ctx),
    info: (msg: string, ctx?: LogContext) => log('info', service, msg, ctx),
    warn: (msg: string, ctx?: LogContext) => log('warn', service, msg, ctx),
    error: (msg: string, ctx?: LogContext) => log('error', service, msg, ctx),
  };
}
