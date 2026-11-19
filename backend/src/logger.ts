export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Structured JSON logs to stdout (CloudWatch-friendly).
 * Callers must never pass customer PII (name, email, phone, message) as context.
 */
export function createLogger(write: (line: string) => void = (l) => console.log(l)): Logger {
  const emit = (level: string, message: string, context?: Record<string, unknown>) =>
    write(JSON.stringify({ time: new Date().toISOString(), level, message, ...context }));
  return {
    info: (m, c) => emit('info', m, c),
    warn: (m, c) => emit('warn', m, c),
    error: (m, c) => emit('error', m, c),
  };
}

export const silentLogger: Logger = { info() {}, warn() {}, error() {} };
