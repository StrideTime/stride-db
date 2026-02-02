/**
 * Project Repository
 *
 * Provides CRUD operations for projects with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and } from 'drizzle-orm';
import type { Project } from '@stridetime/types';
import { projects } from '../drizzle/schema';
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
    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.deleted, false)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find all projects for a user.
   * Excludes deleted projects.
   */
  async findByUserId(db: StrideDatabase, userId: string): Promise<Project[]> {
    const rows = await db.query.projects.findMany({
      where: and(eq(projects.userId, userId), eq(projects.deleted, false)),
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Find all projects in a workspace.
   * Excludes deleted projects.
   */
  async findByWorkspaceId(db: StrideDatabase, workspaceId: string): Promise<Project[]> {
    const rows = await db.query.projects.findMany({
      where: and(eq(projects.workspaceId, workspaceId), eq(projects.deleted, false)),
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
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

    await db.insert(projects).values({
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
      .update(projects)
      .set(dbUpdates)
      .where(and(eq(projects.id, id), eq(projects.deleted, false)));

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
      .update(projects)
      .set({ deleted: true, updatedAt: now() })
      .where(eq(projects.id, id));
  }

  /**
   * Count projects for a user.
   */
  async count(db: StrideDatabase, userId: string): Promise<number> {
    const result = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.deleted, false)));
    return result.length;
  }

  /**
   * Count projects in a workspace.
   */
  async countByWorkspace(db: StrideDatabase, workspaceId: string): Promise<number> {
    const result = await db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.deleted, false)));
    return result.length;
  }
}

/**
 * Singleton instance for convenient access.
 * Note: All methods require db parameter, so this doesn't break transaction composition.
 */
export const projectRepo = new ProjectRepository();
