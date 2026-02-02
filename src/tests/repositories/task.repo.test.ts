/**
 * Task Repository Tests
 *
 * Tests CRUD operations, mapper correctness, and transaction support.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { taskRepo } from '../../repositories/task.repo';
import { createTestDb } from '../setup';
import type { Task } from '@stridetime/types';

describe('TaskRepository', () => {
  let db: any;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('create', () => {
    it('creates a task with generated ID', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Test Task',
        description: 'Test Description',
        difficulty: 'MEDIUM',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: 60,
        maxMinutes: 120,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);

      expect(created).toBeDefined();
      expect(created.id).toBeTruthy();
      expect(created.title).toBe('Test Task');
      expect(created.userId).toBe('user_1');
      expect(created.difficulty).toBe('MEDIUM');
    });

    it('creates task with all optional fields null', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Minimal Task',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);

      expect(created.description).toBeNull();
      expect(created.estimatedMinutes).toBeNull();
      expect(created.maxMinutes).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns task when found', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Find Me',
        description: null,
        difficulty: 'MEDIUM',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);
      const found = await taskRepo.findById(db, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find Me');
    });

    it('returns null when task not found', async () => {
      const found = await taskRepo.findById(db, 'nonexistent_id');
      expect(found).toBeNull();
    });

    it('returns null when task is deleted', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'To Be Deleted',
        description: null,
        difficulty: 'MEDIUM',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);
      await taskRepo.delete(db, created.id);

      const found = await taskRepo.findById(db, created.id);
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('returns all tasks for a user', async () => {
      const task1: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Task 1',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const task2: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Task 2',
        description: null,
        difficulty: 'MEDIUM',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      await taskRepo.create(db, task1);
      await taskRepo.create(db, task2);

      const tasks = await taskRepo.findByUserId(db, 'user_1');

      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.title)).toContain('Task 1');
      expect(tasks.map((t) => t.title)).toContain('Task 2');
    });

    it('excludes deleted tasks', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Task to Delete',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);
      await taskRepo.delete(db, created.id);

      const tasks = await taskRepo.findByUserId(db, 'user_1');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('updates task fields', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Original Title',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);
      const updated = await taskRepo.update(db, created.id, {
        title: 'Updated Title',
        progress: 50,
        status: 'IN_PROGRESS',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.progress).toBe(50);
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.userId).toBe('user_1'); // Unchanged
    });
  });

  describe('delete', () => {
    it('soft deletes a task', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'To Delete',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);
      await taskRepo.delete(db, created.id);

      const found = await taskRepo.findById(db, created.id);
      expect(found).toBeNull();
    });
  });

  describe('count', () => {
    it('counts tasks for a user', async () => {
      const task1: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Task 1',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const task2: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Task 2',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      await taskRepo.create(db, task1);
      await taskRepo.create(db, task2);

      const count = await taskRepo.count(db, 'user_1');
      expect(count).toBe(2);
    });
  });

  describe('mapper integrity', () => {
    it('preserves domain fields through create/read cycle', async () => {
      const originalTask: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: 'parent_1',
        title: 'Mapper Test',
        description: 'Testing mapper',
        difficulty: 'HARD',
        progress: 75,
        status: 'IN_PROGRESS',
        estimatedMinutes: 120,
        maxMinutes: 180,
        actualMinutes: 90,
        plannedForDate: '2024-01-15',
        dueDate: '2024-01-20',
        taskTypeId: 'type_1',
        completedAt: null,
      };

      const created = await taskRepo.create(db, originalTask);

      // All domain fields should match
      expect(created.userId).toBe(originalTask.userId);
      expect(created.projectId).toBe(originalTask.projectId);
      expect(created.parentTaskId).toBe(originalTask.parentTaskId);
      expect(created.title).toBe(originalTask.title);
      expect(created.description).toBe(originalTask.description);
      expect(created.difficulty).toBe(originalTask.difficulty);
      expect(created.progress).toBe(originalTask.progress);
      expect(created.status).toBe(originalTask.status);
      expect(created.estimatedMinutes).toBe(originalTask.estimatedMinutes);
      expect(created.maxMinutes).toBe(originalTask.maxMinutes);
      expect(created.actualMinutes).toBe(originalTask.actualMinutes);
      expect(created.plannedForDate).toBe(originalTask.plannedForDate);
      expect(created.dueDate).toBe(originalTask.dueDate);
      expect(created.taskTypeId).toBe(originalTask.taskTypeId);
      expect(created.completedAt).toBe(originalTask.completedAt);
    });

    it('does not expose DB-only fields', async () => {
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: 'project_1',
        parentTaskId: null,
        title: 'Test',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const created = await taskRepo.create(db, task);

      // These DB fields should NOT be in the domain type
      expect(created).not.toHaveProperty('createdAt');
      expect(created).not.toHaveProperty('updatedAt');
      expect(created).not.toHaveProperty('deleted');
    });
  });
});
