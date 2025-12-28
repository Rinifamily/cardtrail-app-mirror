/**
 * Structured Logger for eBay API Integration
 * 
 * Provides consistent logging with proper levels and structured data.
 * In production, this should be replaced with a proper logging library (pino, winston, etc.)
 * 
 * Features:
 * - Different log levels (debug, info, warn, error)
 * - Structured data logging
 * - Environment-aware (suppresses debug in production)
 * - Easy to extend with correlation IDs, request tracing, etc.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

/**
 * Determine if we're in production
 */
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;

/**
 * Log level priorities
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[logLevel];
}

/**
 * Format log output
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [eBay]`;
  
  if (context && Object.keys(context).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(context)}`;
  }
  
  return `${prefix} ${message}`;
}

/**
 * Logger class
 */
class Logger {
  /**
   * Debug-level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    
    if (isProduction) {
      // In production, use structured JSON logging
      console.log(JSON.stringify({
        level: 'debug',
        timestamp: new Date().toISOString(),
        service: 'ebay-client',
        message,
        ...context,
      }));
    } else {
      // In development, use human-readable format
      console.debug(formatLog('debug', message, context));
    }
  }

  /**
   * Info-level logging
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    
    if (isProduction) {
      console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        service: 'ebay-client',
        message,
        ...context,
      }));
    } else {
      console.log(formatLog('info', message, context));
    }
  }

  /**
   * Warning-level logging
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    
    if (isProduction) {
      console.warn(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        service: 'ebay-client',
        message,
        ...context,
      }));
    } else {
      console.warn(formatLog('warn', message, context));
    }
  }

  /**
   * Error-level logging
   */
  error(message: string, context?: LogContext): void {
    if (!shouldLog('error')) return;
    
    if (isProduction) {
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        service: 'ebay-client',
        message,
        ...context,
        // Include stack trace if error object provided
        stack: context?.error?.stack,
      }));
    } else {
      console.error(formatLog('error', message, context));
    }
  }
}

/**
 * Singleton logger instance for eBay API integration
 * 
 * Renamed to ebayLogger to avoid conflicts with other logging utilities
 */
export const ebayLogger = new Logger();

/**
 * Helper to extract error details for logging
 */
export function getErrorContext(error: any): LogContext {
  return {
    error: error.message || String(error),
    statusCode: error.statusCode || error.response?.status,
    stack: error.stack,
    ...(error.response?.data && { responseData: error.response.data }),
  };
}
