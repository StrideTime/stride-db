/**
 * Project Repository
 *
 * Provides CRUD operations for projects with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and } from 'drizzle-orm';
import type { Project } from '@stridetime/types';
import { projectsTable } from '../drizzle/schema';
import type { ProjectRow, NewProjectRow } from '../drizzle/types';
import type { StrideDatabase } from '../db/client';
import { generateId, now } from '../db/utils';

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain Project type.
 * Excludes DB-only fields (createdAt, updatedAt, deleted).
 */
function toDomain(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    name: row.name,
    description: row.description,
    color: row.color,
    completionPercentage: row.completionPercentage,
  };
}

/**
 * Map domain Project to database insert row.
 * Adds DB-only fields with appropriate defaults.
 */
function toDbInsert(project: Omit<Project, 'id'>): Omit<NewProjectRow, 'id'> {
  const timestamp = now();
  return {
    workspaceId: project.workspaceId,
    userId: project.userId,
    name: project.name,
    description: project.description,
    color: project.color,
    completionPercentage: project.completionPercentage,
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: false,
  };
}

/**
 * Map domain Project partial update to database update row.
 */
function toDbUpdate(project: Partial<Project>): Partial<ProjectRow> {
  return {
    ...project,
    updatedAt: now(),
  };
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class ProjectRepository {
  /**
   * Find a project by ID.
   * Returns null if not found or deleted.
   */
  async findById(db: StrideDatabase, id: string): Promise<Project | null> {
    const row = await db.query.projectsTable.findFirst({
      where: and(eq(projectsTable.id, id), eq(projectsTable.deleted, false)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find all projects for a user.
   * Excludes deleted projectsTable.
   */
  async findByUserId(db: StrideDatabase, userId: string): Promise<Project[]> {
    const rows = await db.query.projectsTable.findMany({
      where: and(eq(projectsTable.userId, userId), eq(projectsTable.deleted, false)),
      orderBy: (_projects, { desc }) => [desc(projectsTable.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all projects in a workspace.
   * Excludes deleted projectsTable.
   */
  async findByWorkspaceId(db: StrideDatabase, workspaceId: string): Promise<Project[]> {
    const rows = await db.query.projectsTable.findMany({
      where: and(eq(projectsTable.workspaceId, workspaceId), eq(projectsTable.deleted, false)),
      orderBy: (_projects, { desc }) => [desc(projectsTable.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Create a new project.
   * Returns the created project with generated ID.
   */
  async create(db: StrideDatabase, project: Omit<Project, 'id'>): Promise<Project> {
    const id = generateId();
    const dbProject = toDbInsert(project);

    await db.insert(projectsTable).values({
      id,
      ...dbProject,
    });

    const created = await this.findById(db, id);
    if (!created) {
      throw new Error('Failed to create project');
    }
    return created;
  }

  /**
   * Update a project.
   * Only updates provided fields.
   */
  async update(db: StrideDatabase, id: string, updates: Partial<Project>): Promise<Project> {
    const dbUpdates = toDbUpdate(updates);

    await db
      .update(projectsTable)
      .set(dbUpdates)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.deleted, false)));

    const updated = await this.findById(db, id);
    if (!updated) {
      throw new Error('Project not found or was deleted');
    }
    return updated;
  }

  /**
   * Soft delete a project.
   * Sets deleted flag to true.
   */
  async delete(db: StrideDatabase, id: string): Promise<void> {
    await db
      .update(projectsTable)
      .set({ deleted: true, updatedAt: now() })
      .where(eq(projectsTable.id, id));
  }

  /**
   * Count projects for a user.
   */
  async count(db: StrideDatabase, userId: string): Promise<number> {
    const result = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.userId, userId), eq(projectsTable.deleted, false)));
    return result.length;
  }

  /**
   * Count projects in a workspace.
   */
  async countByWorkspace(db: StrideDatabase, workspaceId: string): Promise<number> {
    const result = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.workspaceId, workspaceId), eq(projectsTable.deleted, false)));
    return result.length;
  }
}

/**
 * Singleton instance for convenient access.
 * Note: All methods require db parameter, so this doesn't break transaction composition.
 */
export const projectRepo = new ProjectRepository();
