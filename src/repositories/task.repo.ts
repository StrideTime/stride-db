/**
 * Task Repository
 *
 * Provides CRUD operations for tasks with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and, isNull } from 'drizzle-orm';
import type { Task, TaskStatus } from '@stridetime/types';
import { tasks } from '../drizzle/schema';
import type { TaskRow, NewTaskRow } from '../drizzle/types';
import type { StrideDatabase } from '../db/client';
import { generateId, now } from '../db/utils';

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain Task type.
 * Excludes DB-only fields (createdAt, updatedAt, deleted).
 */
function toDomain(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    parentTaskId: row.parentTaskId,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    progress: row.progress,
    status: row.status,
    estimatedMinutes: row.estimatedMinutes,
    maxMinutes: row.maxMinutes,
    actualMinutes: row.actualMinutes,
    plannedForDate: row.plannedForDate,
    dueDate: row.dueDate,
    taskTypeId: row.taskTypeId,
    completedAt: row.completedAt,
  };
}

/**
 * Map domain Task to database insert row.
 * Adds DB-only fields with appropriate defaults.
 */
function toDbInsert(task: Omit<Task, 'id'>): Omit<NewTaskRow, 'id'> {
  const timestamp = now();
  return {
    userId: task.userId,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    description: task.description,
    difficulty: task.difficulty,
    progress: task.progress,
    status: task.status,
    estimatedMinutes: task.estimatedMinutes,
    maxMinutes: task.maxMinutes,
    actualMinutes: task.actualMinutes,
    plannedForDate: task.plannedForDate,
    dueDate: task.dueDate,
    taskTypeId: task.taskTypeId,
    completedAt: task.completedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: false,
  };
}

/**
 * Map domain Task partial update to database update row.
 */
function toDbUpdate(task: Partial<Task>): Partial<TaskRow> {
  return {
    ...task,
    updatedAt: now(),
  };
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class TaskRepository {
  /**
   * Find a task by ID.
   * Returns null if not found or deleted.
   */
  async findById(db: StrideDatabase, id: string): Promise<Task | null> {
    const row = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.deleted, false)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find all tasks for a user.
   * Excludes deleted tasks.
   */
  async findByUserId(db: StrideDatabase, userId: string): Promise<Task[]> {
    const rows = await db.query.tasks.findMany({
      where: and(eq(tasks.userId, userId), eq(tasks.deleted, false)),
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all tasks for a project.
   * Excludes deleted tasks.
   */
  async findByProjectId(db: StrideDatabase, projectId: string): Promise<Task[]> {
    const rows = await db.query.tasks.findMany({
      where: and(eq(tasks.projectId, projectId), eq(tasks.deleted, false)),
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all subtasks of a parent task.
   * Excludes deleted tasks.
   */
  async findSubtasks(db: StrideDatabase, parentTaskId: string): Promise<Task[]> {
    const rows = await db.query.tasks.findMany({
      where: and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.deleted, false)),
      orderBy: (tasks, { asc }) => [asc(tasks.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all top-level tasks (no parent) for a user.
   */
  async findRootTasks(db: StrideDatabase, userId: string): Promise<Task[]> {
    const rows = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        isNull(tasks.parentTaskId),
        eq(tasks.deleted, false)
      ),
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find tasks planned for a specific date.
   */
  async findByPlannedDate(db: StrideDatabase, userId: string, date: string): Promise<Task[]> {
    const rows = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        eq(tasks.plannedForDate, date),
        eq(tasks.deleted, false)
      ),
      orderBy: (tasks, { asc }) => [asc(tasks.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find tasks by status.
   */
  async findByStatus(db: StrideDatabase, userId: string, status: TaskStatus): Promise<Task[]> {
    const rows = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        eq(tasks.status, status),
        eq(tasks.deleted, false)
      ),
      orderBy: (tasks, { desc }) => [desc(tasks.updatedAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find completed tasks for a user.
   */
  async findCompleted(db: StrideDatabase, userId: string): Promise<Task[]> {
    const rows = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'COMPLETED'),
        eq(tasks.deleted, false)
      ),
      orderBy: (tasks, { desc }) => [desc(tasks.completedAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all subtasks of a parent task (alias for findSubtasks).
   * Excludes deleted tasks.
   */
  async findByParentId(db: StrideDatabase, parentTaskId: string): Promise<Task[]> {
    return this.findSubtasks(db, parentTaskId);
  }

  /**
   * Create a new task.
   * Returns the created task with generated ID.
   */
  async create(db: StrideDatabase, task: Omit<Task, 'id'>): Promise<Task> {
    const id = generateId();
    const dbTask = toDbInsert(task);

    await db.insert(tasks).values({
      id,
      ...dbTask,
    });

    const created = await this.findById(db, id);
    if (!created) {
      throw new Error('Failed to create task');
    }
    return created;
  }

  /**
   * Update a task.
   * Only updates provided fields.
   */
  async update(db: StrideDatabase, id: string, updates: Partial<Task>): Promise<Task> {
    const dbUpdates = toDbUpdate(updates);

    await db
      .update(tasks)
      .set(dbUpdates)
      .where(and(eq(tasks.id, id), eq(tasks.deleted, false)));

    const updated = await this.findById(db, id);
    if (!updated) {
      throw new Error('Task not found or was deleted');
    }
    return updated;
  }

  /**
   * Soft delete a task.
   * Sets deleted flag to true.
   */
  async delete(db: StrideDatabase, id: string): Promise<void> {
    await db
      .update(tasks)
      .set({ deleted: true, updatedAt: now() })
      .where(eq(tasks.id, id));
  }

  /**
   * Count tasks for a user.
   */
  async count(db: StrideDatabase, userId: string): Promise<number> {
    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.deleted, false)));
    return result.length;
  }

  /**
   * Count tasks for a project.
   */
  async countByProject(db: StrideDatabase, projectId: string): Promise<number> {
    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.deleted, false)));
    return result.length;
  }
}

/**
 * Singleton instance for convenient access.
 * Note: All methods require db parameter, so this doesn't break transaction composition.
 */
export const taskRepo = new TaskRepository();
