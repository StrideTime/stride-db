/**
 * DailySummary Repository
 *
 * Provides CRUD operations for daily summaries with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type { DailySummary } from '@stridetime/types';
import { dailySummariesTable } from '../drizzle/schema';
import type { DailySummaryRow, NewDailySummaryRow } from '../drizzle/types';
import type { StrideDatabase } from '../db/client';
import { generateId, now } from '../db/utils';

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain DailySummary type.
 * Excludes DB-only fields (createdAt).
 */
function toDomain(row: DailySummaryRow): DailySummary {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    tasksCompleted: row.tasksCompleted,
    tasksWorkedOn: row.tasksWorkedOn,
    totalPoints: row.totalPoints,
    focusMinutes: row.focusMinutes,
    efficiencyRating: row.efficiencyRating,
    standoutMoment: row.standoutMoment,
  };
}

/**
 * Map domain DailySummary to database insert row.
 */
function toDbInsert(summary: Omit<DailySummary, 'id'>): Omit<NewDailySummaryRow, 'id'> {
  return {
    userId: summary.userId,
    date: summary.date,
    tasksCompleted: summary.tasksCompleted,
    tasksWorkedOn: summary.tasksWorkedOn,
    totalPoints: summary.totalPoints,
    focusMinutes: summary.focusMinutes,
    efficiencyRating: summary.efficiencyRating,
    standoutMoment: summary.standoutMoment,
    createdAt: now(),
  };
}

/**
 * Map domain DailySummary partial update to database update row.
 */
function toDbUpdate(summary: Partial<DailySummary>): Partial<DailySummaryRow> {
  return summary;
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class DailySummaryRepository {
  /**
   * Find a daily summary by ID.
   */
  async findById(db: StrideDatabase, id: string): Promise<DailySummary | null> {
    const row = await db.query.dailySummariesTable.findFirst({
      where: eq(dailySummariesTable.id, id),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find daily summary for a user on a specific date.
   */
  async findByDate(db: StrideDatabase, userId: string, date: string): Promise<DailySummary | null> {
    const row = await db.query.dailySummariesTable.findFirst({
      where: and(eq(dailySummariesTable.userId, userId), eq(dailySummariesTable.date, date)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find all summaries for a user.
   */
  async findByUserId(db: StrideDatabase, userId: string): Promise<DailySummary[]> {
    const rows = await db.query.dailySummariesTable.findMany({
      where: eq(dailySummariesTable.userId, userId),
      orderBy: [desc(dailySummariesTable.date)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find summaries within a date range.
   */
  async findByDateRange(
    db: StrideDatabase,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailySummary[]> {
    const rows = await db.query.dailySummariesTable.findMany({
      where: and(
        eq(dailySummariesTable.userId, userId),
        gte(dailySummariesTable.date, startDate),
        lte(dailySummariesTable.date, endDate)
      ),
      orderBy: [desc(dailySummariesTable.date)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find recent summaries (last N days).
   */
  async findRecent(db: StrideDatabase, userId: string, days: number): Promise<DailySummary[]> {
    const rows = await db.query.dailySummariesTable.findMany({
      where: eq(dailySummariesTable.userId, userId),
      orderBy: [desc(dailySummariesTable.date)],
      limit: days,
    });
    return rows.map(toDomain);
  }

  /**
   * Create a new daily summary.
   */
  async create(db: StrideDatabase, summary: Omit<DailySummary, 'id'>): Promise<DailySummary> {
    const id = generateId();
    const dbSummary = toDbInsert(summary);

    await db.insert(dailySummariesTable).values({
      id,
      ...dbSummary,
    });

    const created = await this.findById(db, id);
    if (!created) {
      throw new Error('Failed to create daily summary');
    }
    return created;
  }

  /**
   * Update a daily summary.
   */
  async update(db: StrideDatabase, id: string, updates: Partial<DailySummary>): Promise<DailySummary> {
    const dbUpdates = toDbUpdate(updates);

    await db
      .update(dailySummariesTable)
      .set(dbUpdates)
      .where(eq(dailySummariesTable.id, id));

    const updated = await this.findById(db, id);
    if (!updated) {
      throw new Error('Daily summary not found');
    }
    return updated;
  }

  /**
   * Upsert a daily summary (create or update if exists).
   */
  async upsert(db: StrideDatabase, summary: Omit<DailySummary, 'id'>): Promise<DailySummary> {
    const existing = await this.findByDate(db, summary.userId, summary.date);

    if (existing) {
      return this.update(db, existing.id, summary);
    } else {
      return this.create(db, summary);
    }
  }

  /**
   * Delete a daily summary.
   */
  async delete(db: StrideDatabase, id: string): Promise<void> {
    await db.delete(dailySummariesTable).where(eq(dailySummariesTable.id, id));
  }

  /**
   * Calculate average points over last N days.
   */
  async calculateAveragePoints(db: StrideDatabase, userId: string, days: number): Promise<number> {
    const summaries = await this.findRecent(db, userId, days);

    if (summaries.length === 0) return 0;

    const totalPoints = summaries.reduce((sum, s) => sum + s.totalPoints, 0);
    return totalPoints / summaries.length;
  }

  /**
   * Calculate total focus minutes for a date range.
   */
  async calculateTotalFocusMinutes(
    db: StrideDatabase,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const summaries = await this.findByDateRange(db, userId, startDate, endDate);
    return summaries.reduce((sum, s) => sum + s.focusMinutes, 0);
  }
}

/**
 * Singleton instance for convenient access.
 */
export const dailySummaryRepo = new DailySummaryRepository();
