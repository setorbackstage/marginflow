import "server-only"

type LogLevel = "debug" | "info" | "warn" | "error"

type LogContext = Record<string, unknown>

function write(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  }
  const line = JSON.stringify(entry)

  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

/**
 * Structured, dependency-free logger. Every entry is a single JSON line —
 * safe to pipe into any log aggregator without a dedicated transport.
 */
export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
}
