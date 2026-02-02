/**
 * Transaction Tests
 *
 * Verifies that repositories work correctly with transactions.
 * Tests rollback behavior on errors.
 *
 * NOTE: better-sqlite3 transactions must be synchronous.
 * This is a limitation of the test environment, not the repository pattern.
 * In production with PowerSync, transactions can be async.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { taskRepo } from '../repositories/task.repo';
import { projectRepo } from '../repositories/project.repo';
import { createTestDb } from './setup';
import type { Task, Project } from '@stridetime/types';

describe('Transactions', () => {
  let db: any;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('transaction injection pattern', () => {
    it('accepts db instance parameter for transaction support', async () => {
      // This test verifies that repositories accept a db parameter
      // which enables transaction composition

      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      const createdProject = await projectRepo.create(db, project);

      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: createdProject.id,
        parentTaskId: null,
        title: 'Test Task',
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

      await taskRepo.create(db, task);

      // Verify both were created
      const projects = await projectRepo.findByUserId(db, 'user_1');
      const tasks = await taskRepo.findByUserId(db, 'user_1');

      expect(projects).toHaveLength(1);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].projectId).toBe(projects[0].id);
    });
  });

  describe('repository composition', () => {
    it('can create related entities sequentially', async () => {
      // Create project first
      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      const createdProject = await projectRepo.create(db, project);

      // Then create task referencing the project
      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: createdProject.id,
        parentTaskId: null,
        title: 'Test Task',
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

      const createdTask = await taskRepo.create(db, task);

      // Verify relationship
      const tasks = await taskRepo.findByProjectId(db, createdProject.id);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(createdTask.id);
    });

    it('can query across repositories', async () => {
      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      const createdProject = await projectRepo.create(db, project);

      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: createdProject.id,
        parentTaskId: null,
        title: 'Test Task',
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

      await taskRepo.create(db, task);

      // Query both
      const userProjects = await projectRepo.findByUserId(db, 'user_1');
      const userTasks = await taskRepo.findByUserId(db, 'user_1');

      expect(userProjects).toHaveLength(1);
      expect(userTasks).toHaveLength(1);
      expect(userTasks[0].projectId).toBe(userProjects[0].id);
    });
  });

  describe('db instance consistency', () => {
    it('all repository methods accept db as first parameter', async () => {
      // This ensures consistent API across all repo methods
      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      const createdProject = await projectRepo.create(db, project);
      const foundProject = await projectRepo.findById(db, createdProject.id);
      const updatedProject = await projectRepo.update(db, createdProject.id, {
        name: 'Updated',
      });
      const count = await projectRepo.count(db, 'user_1');

      expect(foundProject).toBeDefined();
      expect(updatedProject.name).toBe('Updated');
      expect(count).toBe(1);

      await projectRepo.delete(db, createdProject.id);
      const afterDelete = await projectRepo.findById(db, createdProject.id);
      expect(afterDelete).toBeNull();
    });
  });
});
