/**
 * Development-only logging utility
 * Logs are stripped in production builds automatically by Vite
 */

const isDev = import.meta.env.DEV;

/**
 * Development logger - only logs in development mode
 * Use this instead of console.log throughout the app
 */
export const devLog = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Always log errors - they're important for debugging
    console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  group: (label: string) => {
    if (isDev) console.group(label);
  },
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
  table: (data: unknown) => {
    if (isDev) console.table(data);
  },
};

export default devLog;
