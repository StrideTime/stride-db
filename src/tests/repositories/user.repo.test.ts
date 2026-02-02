/**
 * User Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { userRepo } from '../../repositories/user.repo';
import { createTestDb } from '../setup';
import type { User } from '@stridetime/types';

describe('UserRepository', () => {
  let db: any;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('create', () => {
    it('creates a user', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'America/Los_Angeles',
      };

      const created = await userRepo.create(db, user);

      expect(created.id).toBeTruthy();
      expect(created.email).toBe('test@example.com');
      expect(created.firstName).toBe('Test');
      expect(created.lastName).toBe('User');
      expect(created.timezone).toBe('America/Los_Angeles');
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      const created = await userRepo.create(db, user);
      const found = await userRepo.findById(db, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('test@example.com');
    });

    it('returns null when not found', async () => {
      const found = await userRepo.findById(db, 'nonexistent');
      expect(found).toBeNull();
    });

    it('returns null when user is soft deleted', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      const created = await userRepo.create(db, user);
      await userRepo.delete(db, created.id);

      const found = await userRepo.findById(db, created.id);
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns user when found by email', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      await userRepo.create(db, user);
      const found = await userRepo.findByEmail(db, 'test@example.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe('test@example.com');
    });

    it('returns null when not found', async () => {
      const found = await userRepo.findByEmail(db, 'nonexistent@example.com');
      expect(found).toBeNull();
    });

    it('returns null when user is soft deleted', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      const created = await userRepo.create(db, user);
      await userRepo.delete(db, created.id);

      const found = await userRepo.findByEmail(db, 'test@example.com');
      expect(found).toBeNull();
    });
  });

  describe('emailExists', () => {
    it('returns true when email exists', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      await userRepo.create(db, user);
      const exists = await userRepo.emailExists(db, 'test@example.com');

      expect(exists).toBe(true);
    });

    it('returns false when email does not exist', async () => {
      const exists = await userRepo.emailExists(db, 'nonexistent@example.com');
      expect(exists).toBe(false);
    });

    it('returns false when user is soft deleted', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      const created = await userRepo.create(db, user);
      await userRepo.delete(db, created.id);

      const exists = await userRepo.emailExists(db, 'test@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('update', () => {
    it('updates user fields', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      const created = await userRepo.create(db, user);
      const updated = await userRepo.update(db, created.id, {
        firstName: 'Updated',
        timezone: 'America/New_York',
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.timezone).toBe('America/New_York');
      expect(updated.lastName).toBe('User'); // Unchanged
    });
  });

  describe('delete', () => {
    it('soft deletes a user', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      const created = await userRepo.create(db, user);
      await userRepo.delete(db, created.id);

      const found = await userRepo.findById(db, created.id);
      expect(found).toBeNull();
    });
  });

  describe('mapper integrity', () => {
    it('excludes DB-only fields', async () => {
      const user: Omit<User, 'id'> = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      };

      const created = await userRepo.create(db, user);

      expect(created).not.toHaveProperty('createdAt');
      expect(created).not.toHaveProperty('updatedAt');
      expect(created).not.toHaveProperty('deleted');
    });
  });
});
