/**
 * TaskType Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { taskTypeRepo } from '../../repositories/task-type.repo';
import { createTestDb } from '../setup';
import type { TaskType } from '@stridetime/types';

describe('TaskTypeRepository', () => {
  let db: any;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('create', () => {
    it('creates a task type', async () => {
      const taskType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Feature',
        icon: '🚀',
        color: '#3B82F6',
        isDefault: false,
        displayOrder: 0,
      };

      const created = await taskTypeRepo.create(db, taskType);

      expect(created.id).toBeTruthy();
      expect(created.name).toBe('Feature');
      expect(created.icon).toBe('🚀');
      expect(created.color).toBe('#3B82F6');
      expect(created.isDefault).toBe(false);
    });

    it('creates a workspace-scoped task type', async () => {
      const taskType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: 'workspace_1',
        name: 'Team Task',
        icon: '👥',
        color: '#8B5CF6',
        isDefault: false,
        displayOrder: 0,
      };

      const created = await taskTypeRepo.create(db, taskType);

      expect(created.workspaceId).toBe('workspace_1');
      expect(created.name).toBe('Team Task');
    });
  });

  describe('findById', () => {
    it('returns task type when found', async () => {
      const taskType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Bug',
        icon: '🐛',
        color: '#EF4444',
        isDefault: false,
        displayOrder: 0,
      };

      const created = await taskTypeRepo.create(db, taskType);
      const found = await taskTypeRepo.findById(db, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Bug');
    });

    it('returns null when not found', async () => {
      const found = await taskTypeRepo.findById(db, 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('returns all task types for a user', async () => {
      const taskType1: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Feature',
        icon: '🚀',
        color: '#3B82F6',
        isDefault: false,
        displayOrder: 0,
      };

      const taskType2: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Bug',
        icon: '🐛',
        color: '#EF4444',
        isDefault: false,
        displayOrder: 1,
      };

      await taskTypeRepo.create(db, taskType1);
      await taskTypeRepo.create(db, taskType2);

      const taskTypes = await taskTypeRepo.findByUser(db, 'user_1');

      expect(taskTypes).toHaveLength(2);
      expect(taskTypes.every((t) => t.userId === 'user_1')).toBe(true);
    });

    it('includes workspace-scoped task types when workspaceId provided', async () => {
      const personalType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Personal',
        icon: '👤',
        color: '#6B7280',
        isDefault: false,
        displayOrder: 0,
      };

      const workspaceType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: 'workspace_1',
        name: 'Team',
        icon: '👥',
        color: '#8B5CF6',
        isDefault: false,
        displayOrder: 1,
      };

      await taskTypeRepo.create(db, personalType);
      await taskTypeRepo.create(db, workspaceType);

      const taskTypes = await taskTypeRepo.findByUser(db, 'user_1', 'workspace_1');

      // Should include both personal and workspace types
      expect(taskTypes.length).toBeGreaterThanOrEqual(2);
      const names = taskTypes.map((t) => t.name);
      expect(names).toContain('Personal');
      expect(names).toContain('Team');
    });

    it('excludes workspace-scoped task types when no workspaceId provided', async () => {
      const personalType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Personal',
        icon: '👤',
        color: '#6B7280',
        isDefault: false,
        displayOrder: 0,
      };

      const workspaceType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: 'workspace_1',
        name: 'Team',
        icon: '👥',
        color: '#8B5CF6',
        isDefault: false,
        displayOrder: 1,
      };

      await taskTypeRepo.create(db, personalType);
      await taskTypeRepo.create(db, workspaceType);

      const taskTypes = await taskTypeRepo.findByUser(db, 'user_1');

      // Should only include personal types
      expect(taskTypes).toHaveLength(1);
      expect(taskTypes[0].name).toBe('Personal');
    });
  });

  describe('findDefault', () => {
    it('returns default task type for user', async () => {
      const taskType1: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Feature',
        icon: '🚀',
        color: '#3B82F6',
        isDefault: false,
        displayOrder: 0,
      };

      const taskType2: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Default',
        icon: '⭐',
        color: '#10B981',
        isDefault: true,
        displayOrder: 1,
      };

      await taskTypeRepo.create(db, taskType1);
      const defaultType = await taskTypeRepo.create(db, taskType2);

      const found = await taskTypeRepo.findDefault(db, 'user_1');

      expect(found).toBeDefined();
      expect(found?.id).toBe(defaultType.id);
      expect(found?.isDefault).toBe(true);
    });

    it('returns null when no default task type', async () => {
      const found = await taskTypeRepo.findDefault(db, 'user_1');
      expect(found).toBeNull();
    });
  });

  describe('setDefault', () => {
    it('sets a task type as default and clears others', async () => {
      const taskType1: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Feature',
        icon: '🚀',
        color: '#3B82F6',
        isDefault: true,
        displayOrder: 0,
      };

      const taskType2: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Bug',
        icon: '🐛',
        color: '#EF4444',
        isDefault: false,
        displayOrder: 1,
      };

      const created1 = await taskTypeRepo.create(db, taskType1);
      const created2 = await taskTypeRepo.create(db, taskType2);

      // Set taskType2 as default
      await taskTypeRepo.setDefault(db, 'user_1', created2.id);

      const found1 = await taskTypeRepo.findById(db, created1.id);
      const found2 = await taskTypeRepo.findById(db, created2.id);

      expect(found1?.isDefault).toBe(false);
      expect(found2?.isDefault).toBe(true);
    });
  });

  describe('update', () => {
    it('updates task type fields', async () => {
      const taskType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Feature',
        icon: '🚀',
        color: '#3B82F6',
        isDefault: false,
        displayOrder: 0,
      };

      const created = await taskTypeRepo.create(db, taskType);
      const updated = await taskTypeRepo.update(db, created.id, {
        name: 'Epic Feature',
        icon: '🎯',
      });

      expect(updated.name).toBe('Epic Feature');
      expect(updated.icon).toBe('🎯');
      expect(updated.color).toBe('#3B82F6'); // Unchanged
    });
  });

  describe('delete', () => {
    it('deletes a task type', async () => {
      const taskType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Feature',
        icon: '🚀',
        color: '#3B82F6',
        isDefault: false,
        displayOrder: 0,
      };

      const created = await taskTypeRepo.create(db, taskType);
      await taskTypeRepo.delete(db, created.id);

      const found = await taskTypeRepo.findById(db, created.id);
      expect(found).toBeNull();
    });
  });

  describe('mapper integrity', () => {
    it('excludes DB-only fields', async () => {
      const taskType: Omit<TaskType, 'id'> = {
        userId: 'user_1',
        workspaceId: null,
        name: 'Feature',
        icon: '🚀',
        color: '#3B82F6',
        isDefault: false,
        displayOrder: 0,
      };

      const created = await taskTypeRepo.create(db, taskType);

      expect(created).not.toHaveProperty('createdAt');
    });
  });
});
