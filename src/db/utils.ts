/**
 * Database utility functions
 */

/**
 * Generate a new UUID v4 for use as entity IDs.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get the current ISO timestamp.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}
