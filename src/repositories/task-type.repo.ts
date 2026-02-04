/**
 * TaskType Repository
 *
 * Provides CRUD operations for task types with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and, or, isNull, asc } from 'drizzle-orm';
import type { TaskType } from '@stridetime/types';
import { taskTypesTable } from '../drizzle/schema';
import type { TaskTypeRow, NewTaskTypeRow } from '../drizzle/types';
import type { StrideDatabase } from '../db/client';
import { generateId, now } from '../db/utils';

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain TaskType type.
 * Excludes DB-only fields (createdAt).
 */
function toDomain(row: TaskTypeRow): TaskType {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isDefault: row.isDefault,
    displayOrder: row.displayOrder,
  };
}

/**
 * Map domain TaskType to database insert row.
 */
function toDbInsert(taskType: Omit<TaskType, 'id'>): Omit<NewTaskTypeRow, 'id'> {
  return {
    workspaceId: taskType.workspaceId,
    userId: taskType.userId,
    name: taskType.name,
    icon: taskType.icon,
    color: taskType.color,
    isDefault: taskType.isDefault,
    displayOrder: taskType.displayOrder,
    createdAt: now(),
  };
}

/**
 * Map domain TaskType partial update to database update row.
 */
function toDbUpdate(taskType: Partial<TaskType>): Partial<TaskTypeRow> {
  return taskType;
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class TaskTypeRepository {
  /**
   * Find a task type by ID.
   */
  async findById(db: StrideDatabase, id: string): Promise<TaskType | null> {
    const row = await db.query.taskTypesTable.findFirst({
      where: eq(taskTypesTable.id, id),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find all task types for a user (personal + workspace types).
   */
  async findByUser(db: StrideDatabase, userId: string, workspaceId?: string): Promise<TaskType[]> {
    const conditions = workspaceId
      ? or(
          and(eq(taskTypesTable.userId, userId), isNull(taskTypesTable.workspaceId)),
          eq(taskTypesTable.workspaceId, workspaceId)
        )
      : and(eq(taskTypesTable.userId, userId), isNull(taskTypesTable.workspaceId));

    const rows = await db.query.taskTypesTable.findMany({
      where: conditions,
      orderBy: [asc(taskTypesTable.displayOrder), asc(taskTypesTable.name)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all task types for a workspace.
   */
  async findByWorkspace(db: StrideDatabase, workspaceId: string): Promise<TaskType[]> {
    const rows = await db.query.taskTypesTable.findMany({
      where: eq(taskTypesTable.workspaceId, workspaceId),
      orderBy: [asc(taskTypesTable.displayOrder), asc(taskTypesTable.name)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find default task type for a user.
   */
  async findDefault(db: StrideDatabase, userId: string): Promise<TaskType | null> {
    const row = await db.query.taskTypesTable.findFirst({
      where: and(eq(taskTypesTable.userId, userId), eq(taskTypesTable.isDefault, true)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Create a new task type.
   */
  async create(db: StrideDatabase, taskType: Omit<TaskType, 'id'>): Promise<TaskType> {
    const id = generateId();
    const dbTaskType = toDbInsert(taskType);

    await db.insert(taskTypesTable).values({
      id,
      ...dbTaskType,
    });

    const created = await this.findById(db, id);
    if (!created) {
      throw new Error('Failed to create task type');
    }
    return created;
  }

  /**
   * Update a task type.
   */
  async update(db: StrideDatabase, id: string, updates: Partial<TaskType>): Promise<TaskType> {
    const dbUpdates = toDbUpdate(updates);

    await db
      .update(taskTypesTable)
      .set(dbUpdates)
      .where(eq(taskTypesTable.id, id));

    const updated = await this.findById(db, id);
    if (!updated) {
      throw new Error('Task type not found');
    }
    return updated;
  }

  /**
   * Delete a task type.
   */
  async delete(db: StrideDatabase, id: string): Promise<void> {
    await db.delete(taskTypesTable).where(eq(taskTypesTable.id, id));
  }

  /**
   * Reorder task types.
   */
  async reorder(db: StrideDatabase, taskTypeIds: string[]): Promise<void> {
    for (let i = 0; i < taskTypeIds.length; i++) {
      await db
        .update(taskTypesTable)
        .set({ displayOrder: i })
        .where(eq(taskTypesTable.id, taskTypeIds[i]));
    }
  }

  /**
   * Set a task type as default (and unset others).
   */
  async setDefault(db: StrideDatabase, userId: string, taskTypeId: string): Promise<void> {
    // Unset all defaults for user
    await db
      .update(taskTypesTable)
      .set({ isDefault: false })
      .where(eq(taskTypesTable.userId, userId));

    // Set the new default
    await db
      .update(taskTypesTable)
      .set({ isDefault: true })
      .where(eq(taskTypesTable.id, taskTypeId));
  }
}

/**
 * Singleton instance for convenient access.
 */
export const taskTypeRepo = new TaskTypeRepository();
