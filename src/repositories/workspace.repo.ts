/**
 * Workspace Repository
 *
 * Provides CRUD operations for workspaces with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and } from 'drizzle-orm';
import type { Workspace } from '@stridetime/types';
import { workspacesTable } from '../drizzle/schema';
import type { WorkspaceRow, NewWorkspaceRow } from '../drizzle/types';
import type { StrideDatabase } from '../db/client';
import { generateId, now } from '../db/utils';

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain Workspace type.
 * Excludes DB-only fields (createdAt, updatedAt, deleted).
 */
function toDomain(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    type: row.type,
  };
}

/**
 * Map domain Workspace to database insert row.
 * Adds DB-only fields with appropriate defaults.
 */
function toDbInsert(workspace: Omit<Workspace, 'id'>): Omit<NewWorkspaceRow, 'id'> {
  const timestamp = now();
  return {
    ownerUserId: workspace.ownerUserId,
    name: workspace.name,
    type: workspace.type,
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: false,
  };
}

/**
 * Map domain Workspace partial update to database update row.
 */
function toDbUpdate(workspace: Partial<Workspace>): Partial<WorkspaceRow> {
  return {
    ...workspace,
    updatedAt: now(),
  };
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class WorkspaceRepository {
  /**
   * Find a workspace by ID.
   * Returns null if not found or deleted.
   */
  async findById(db: StrideDatabase, id: string): Promise<Workspace | null> {
    const row = await db.query.workspacesTable.findFirst({
      where: and(eq(workspacesTable.id, id), eq(workspacesTable.deleted, false)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find all workspaces owned by a user.
   * Excludes deleted workspacesTable.
   */
  async findByOwner(db: StrideDatabase, ownerUserId: string): Promise<Workspace[]> {
    const rows = await db.query.workspacesTable.findMany({
      where: and(eq(workspacesTable.ownerUserId, ownerUserId), eq(workspacesTable.deleted, false)),
      orderBy: (_workspaces, { desc }) => [desc(workspacesTable.createdAt)],
    });
    return rows.map(toDomain);
  }

  /**
   * Create a new workspace.
   * Returns the created workspace with generated ID.
   */
  async create(db: StrideDatabase, workspace: Omit<Workspace, 'id'>): Promise<Workspace> {
    const id = generateId();
    const dbWorkspace = toDbInsert(workspace);

    await db.insert(workspacesTable).values({
      id,
      ...dbWorkspace,
    });

    const created = await this.findById(db, id);
    if (!created) {
      throw new Error('Failed to create workspace');
    }
    return created;
  }

  /**
   * Update a workspace.
   * Only updates provided fields.
   */
  async update(db: StrideDatabase, id: string, updates: Partial<Workspace>): Promise<Workspace> {
    const dbUpdates = toDbUpdate(updates);

    await db
      .update(workspacesTable)
      .set(dbUpdates)
      .where(and(eq(workspacesTable.id, id), eq(workspacesTable.deleted, false)));

    const updated = await this.findById(db, id);
    if (!updated) {
      throw new Error('Workspace not found or was deleted');
    }
    return updated;
  }

  /**
   * Soft delete a workspace.
   * Sets deleted flag to true.
   */
  async delete(db: StrideDatabase, id: string): Promise<void> {
    await db
      .update(workspacesTable)
      .set({ deleted: true, updatedAt: now() })
      .where(eq(workspacesTable.id, id));
  }

  /**
   * Count workspaces for an owner.
   */
  async count(db: StrideDatabase, ownerUserId: string): Promise<number> {
    const result = await db
      .select()
      .from(workspacesTable)
      .where(and(eq(workspacesTable.ownerUserId, ownerUserId), eq(workspacesTable.deleted, false)));
    return result.length;
  }
}

/**
 * Singleton instance for convenient access.
 * Note: All methods require db parameter, so this doesn't break transaction composition.
 */
export const workspaceRepo = new WorkspaceRepository();
