const PREFIX = '[AdBlockPro]';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'warn';

export const logger = {
  setLevel(level: LogLevel) {
    currentLevel = level;
  },

  debug(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.debug(PREFIX, ...args);
    }
  },

  info(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.info(PREFIX, ...args);
    }
  },

  warn(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(PREFIX, ...args);
    }
  },

  error(...args: unknown[]) {
    console.error(PREFIX, ...args);
  },
};
