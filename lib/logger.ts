/**
 * Structured JSON logger.
 * Never log: API secrets, raw tokens, full payment payloads, or unnecessary PII.
 */

type Level = 'info' | 'warn' | 'error';

interface LogEntry {
  level: Level;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function redact<T extends Record<string, unknown>>(obj: T): T {
  const REDACTED_KEYS = new Set([
    'password', 'secret', 'token', 'apiKey', 'secretKey',
    'authorization', 'download_token_hash', 'card',
  ]);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = REDACTED_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return result as T;
}

function log(level: Level, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? redact(context) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};
