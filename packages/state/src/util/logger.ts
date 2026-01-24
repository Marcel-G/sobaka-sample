/**
 * Development-only logger utility
 * 
 * All logging is stripped in production builds.
 * Use this instead of console.log/warn/error directly.
 */

const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true

/**
 * Log a debug message (development only)
 */
export const log = isDev
  ? (prefix: string, ...args: unknown[]) => console.log(`[${prefix}]`, ...args)
  : () => {}

/**
 * Log an info message (development only)
 */
export const info = isDev
  ? (prefix: string, ...args: unknown[]) => console.info(`[${prefix}]`, ...args)
  : () => {}

/**
 * Log a warning (development only)
 */
export const warn = isDev
  ? (prefix: string, ...args: unknown[]) => console.warn(`[${prefix}]`, ...args)
  : () => {}

/**
 * Log an error (development only)
 * Note: You may want to keep error logging in production for debugging.
 * If so, use console.error directly for critical errors.
 */
export const error = isDev
  ? (prefix: string, ...args: unknown[]) => console.error(`[${prefix}]`, ...args)
  : () => {}

/**
 * Create a prefixed logger for a specific module
 */
export const createLogger = (prefix: string) => ({
  log: (...args: unknown[]) => log(prefix, ...args),
  info: (...args: unknown[]) => info(prefix, ...args),
  warn: (...args: unknown[]) => warn(prefix, ...args),
  error: (...args: unknown[]) => error(prefix, ...args),
})
