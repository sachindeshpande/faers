/**
 * Database types for better-sqlite3
 *
 * We use 'any' here because the actual Database type is loaded dynamically
 * at runtime to avoid bundler issues with native modules.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseInstance = any;
