/**
 * User Repository
 *
 * Provides CRUD operations for users with proper domain/DB type mapping.
 * All methods accept a DB instance to support transactions.
 */

import { eq, and } from 'drizzle-orm';
import type { User } from '@stridetime/types';
import { usersTable } from '../drizzle/schema';
import type { UserRow, NewUserRow } from '../drizzle/types';
import type { StrideDatabase } from '../db/client';
import { generateId, now } from '../db/utils';

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain User type.
 * Excludes DB-only fields (createdAt, updatedAt, deleted).
 */
function toDomain(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl,
    timezone: row.timezone,
  };
}

/**
 * Map domain User to database insert row.
 */
function toDbInsert(user: Omit<User, 'id'>): Omit<NewUserRow, 'id'> {
  const timestamp = now();
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: false,
  };
}

/**
 * Map domain User partial update to database update row.
 */
function toDbUpdate(user: Partial<User>): Partial<UserRow> {
  return {
    ...user,
    updatedAt: now(),
  };
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class UserRepository {
  /**
   * Find a user by ID.
   * Returns null if not found or deleted.
   */
  async findById(db: StrideDatabase, id: string): Promise<User | null> {
    const row = await db.query.usersTable.findFirst({
      where: and(eq(usersTable.id, id), eq(usersTable.deleted, false)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Find a user by email.
   * Returns null if not found or deleted.
   */
  async findByEmail(db: StrideDatabase, email: string): Promise<User | null> {
    const row = await db.query.usersTable.findFirst({
      where: and(eq(usersTable.email, email), eq(usersTable.deleted, false)),
    });
    return row ? toDomain(row) : null;
  }

  /**
   * Create a new user.
   * Returns the created user with generated ID.
   */
  async create(db: StrideDatabase, user: Omit<User, 'id'>): Promise<User> {
    const id = generateId();
    const dbUser = toDbInsert(user);

    await db.insert(usersTable).values({
      id,
      ...dbUser,
    });

    const created = await this.findById(db, id);
    if (!created) {
      throw new Error('Failed to create user');
    }
    return created;
  }

  /**
   * Update a user.
   * Only updates provided fields.
   */
  async update(db: StrideDatabase, id: string, updates: Partial<User>): Promise<User> {
    const dbUpdates = toDbUpdate(updates);

    await db
      .update(usersTable)
      .set(dbUpdates)
      .where(and(eq(usersTable.id, id), eq(usersTable.deleted, false)));

    const updated = await this.findById(db, id);
    if (!updated) {
      throw new Error('User not found or was deleted');
    }
    return updated;
  }

  /**
   * Soft delete a user.
   * Sets deleted flag to true.
   */
  async delete(db: StrideDatabase, id: string): Promise<void> {
    await db
      .update(usersTable)
      .set({ deleted: true, updatedAt: now() })
      .where(eq(usersTable.id, id));
  }

  /**
   * Check if an email is already taken.
   */
  async emailExists(db: StrideDatabase, email: string): Promise<boolean> {
    const user = await this.findByEmail(db, email);
    return user !== null;
  }
}

/**
 * Singleton instance for convenient access.
 */
export const userRepo = new UserRepository();
