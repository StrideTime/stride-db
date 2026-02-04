/**
 * TimeEntry Repository
 *
 * Provides CRUD operations for time entries with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and, gte, lte, desc, isNull } from 'drizzle-orm';
import type { TimeEntry } from '@stridetime/types';
import { timeEntriesTable } from '../drizzle/schema';
import type { TimeEntryRow, NewTimeEntryRow } from '../drizzle/types';
import type { StrideDatabase } from '../db/client';
import { generateId, now } from '../db/utils';

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain TimeEntry type.
 * Excludes DB-only fields (createdAt).
 */
function toDomain(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
  };
}

/**
 * Map domain TimeEntry to database insert row.
 */
function toDbInsert(entry: Omit<TimeEntry, 'id'>): Omit<NewTimeEntryRow, 'id'> {
  return {
    taskId: entry.taskId,
    userId: entry.userId,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    createdAt: now(),
  };
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class TimeEntryRepository {
  /**
   * Find a time entry by ID.
   */
  async findById(db: StrideDatabase, id: string): Promise<TimeEntry | null> {
    const row = await db.query.timeEntriesTable.findFirst({
      where: eq(timeEntriesTable.id, id),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find all time entries for a task.
   */
  async findByTaskId(db: StrideDatabase, taskId: string): Promise<TimeEntry[]> {
    const rows = await db.query.timeEntriesTable.findMany({
      where: eq(timeEntriesTable.taskId, taskId),
      orderBy: [desc(timeEntriesTable.startedAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all time entries for a user.
   */
  async findByUserId(db: StrideDatabase, userId: string): Promise<TimeEntry[]> {
    const rows = await db.query.timeEntriesTable.findMany({
      where: eq(timeEntriesTable.userId, userId),
      orderBy: [desc(timeEntriesTable.startedAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find time entries within a date range.
   */
  async findByDateRange(
    db: StrideDatabase,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeEntry[]> {
    const rows = await db.query.timeEntriesTable.findMany({
      where: and(
        eq(timeEntriesTable.userId, userId),
        gte(timeEntriesTable.startedAt, startDate),
        lte(timeEntriesTable.startedAt, endDate)
      ),
      orderBy: [desc(timeEntriesTable.startedAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find active (ongoing) time entry for a user.
   */
  async findActive(db: StrideDatabase, userId: string): Promise<TimeEntry | null> {
    const row = await db.query.timeEntriesTable.findFirst({
      where: and(eq(timeEntriesTable.userId, userId), isNull(timeEntriesTable.endedAt)),
      orderBy: [desc(timeEntriesTable.startedAt)],
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Create a new time entry (start timer).
   */
  async create(db: StrideDatabase, entry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> {
    const id = generateId();
    const dbEntry = toDbInsert(entry);

    await db.insert(timeEntriesTable).values({
      id,
      ...dbEntry,
    });

    const created = await this.findById(db, id);
    if (!created) {
      throw new Error('Failed to create time entry');
    }
    return created;
  }

  /**
   * Stop a time entry (end timer).
   */
  async stop(db: StrideDatabase, id: string, endedAt: string): Promise<TimeEntry> {
    await db
      .update(timeEntriesTable)
      .set({ endedAt })
      .where(eq(timeEntriesTable.id, id));

    const updated = await this.findById(db, id);
    if (!updated) {
      throw new Error('Time entry not found');
    }
    return updated;
  }

  /**
   * Delete a time entry.
   */
  async delete(db: StrideDatabase, id: string): Promise<void> {
    await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, id));
  }

  /**
   * Calculate total minutes for a task.
   */
  async calculateTotalMinutes(db: StrideDatabase, taskId: string): Promise<number> {
    const entries = await this.findByTaskId(db, taskId);

    return entries.reduce((total, entry) => {
      if (!entry.endedAt) return total;

      const start = new Date(entry.startedAt).getTime();
      const end = new Date(entry.endedAt).getTime();
      const minutes = Math.floor((end - start) / 60000);

      return total + minutes;
    }, 0);
  }
}

/**
 * Singleton instance for convenient access.
 */
export const timeEntryRepo = new TimeEntryRepository();
