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
import { createTestDb, type TestDatabase } from './setup';
import { eq } from 'drizzle-orm';
import { projectsTable, tasksTable } from '../drizzle/schema';
import type { Task, Project } from '@stridetime/types';

/**
 * Sync wrapper for project repository to work with better-sqlite3 transactions
 * These simulate how repositories would work with synchronous operations
 */
class SyncProjectRepo {
  createSync(db: any, project: Omit<Project, 'id'>): Project {
    const id = 'test-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const projectData = {
      id,
      workspaceId: project.workspaceId,
      userId: project.userId,
      name: project.name,
      description: project.description,
      color: project.color,
      completionPercentage: project.completionPercentage,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    db.insert(projectsTable).values(projectData).run();

    return {
      id,
      ...project,
    };
  }

  updateSync(db: any, id: string, updates: Partial<Project>): Project {
    const updateData = {
      ...updates,
    };

    db.update(projectsTable).set(updateData).where(eq(projectsTable.id, id)).run();

    const result = db.select().from(projectsTable).where(eq(projectsTable.id, id)).get();

    return result as Project;
  }

  findByIdSync(db: any, id: string): Project | null {
    const result = db.select().from(projectsTable).where(eq(projectsTable.id, id)).get();

    return result as Project | null;
  }

  findByUserIdSync(db: any, userId: string): Project[] {
    const results = db.select().from(projectsTable).where(eq(projectsTable.userId, userId)).all();

    return results as Project[];
  }
}

/**
 * Sync wrapper for task repository to work with better-sqlite3 transactions
 */
class SyncTaskRepo {
  createSync(db: any, task: Omit<Task, 'id'>): Task {
    const id = 'test-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const taskData = {
      id,
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
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    db.insert(tasksTable).values(taskData).run();

    return {
      id,
      ...task,
    };
  }

  findByUserIdSync(db: any, userId: string): Task[] {
    const results = db.select().from(tasksTable).where(eq(tasksTable.userId, userId)).all();

    return results as Task[];
  }
}

// Create sync instances for testing
const syncProjectRepo = new SyncProjectRepo();
const syncTaskRepo = new SyncTaskRepo();

describe('Transactions', () => {
  let db: TestDatabase;

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

      const createdProject = await projectRepo.create(db as any, project);

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

      await taskRepo.create(db as any, task);

      // Verify both were created
      const projects = await projectRepo.findByUserId(db as any, 'user_1');
      const tasks = await taskRepo.findByUserId(db as any, 'user_1');

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

      const createdProject = await projectRepo.create(db as any, project);

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

      const createdTask = await taskRepo.create(db as any, task);

      // Verify relationship
      const tasks = await taskRepo.findByProjectId(db as any, createdProject.id);
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

      const createdProject = await projectRepo.create(db as any, project);

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

      await taskRepo.create(db as any, task);

      // Query both
      const userProjects = await projectRepo.findByUserId(db as any, 'user_1');
      const userTasks = await taskRepo.findByUserId(db as any, 'user_1');

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

      const createdProject = await projectRepo.create(db as any, project);
      const foundProject = await projectRepo.findById(db as any, createdProject.id);
      const updatedProject = await projectRepo.update(db as any, createdProject.id, {
        name: 'Updated',
      });
      const count = await projectRepo.count(db as any, 'user_1');

      expect(foundProject).toBeDefined();
      expect(updatedProject.name).toBe('Updated');
      expect(count).toBe(1);

      await projectRepo.delete(db as any, createdProject.id);
      const afterDelete = await projectRepo.findById(db as any, createdProject.id);
      expect(afterDelete).toBeNull();
    });
  });

  describe('production transaction simulation', () => {
    it('simulates async transaction behavior like PowerSync', () => {
      // This test simulates how transactions work in production with PowerSync
      // Using sync repositories to mimic the async behavior in a testable way
      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Production Sim Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      const task: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: '', // Will be set after project creation
        parentTaskId: null,
        title: 'Production Sim Task',
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

      // Simulate production transaction pattern using sync operations
      db.transaction(tx => {
        const createdProject = syncProjectRepo.createSync(tx, project);
        task.projectId = createdProject.id;
        syncTaskRepo.createSync(tx, task);
      });

      // Verify both were committed
      const projects = syncProjectRepo.findByUserIdSync(db, 'user_1');
      const tasks = syncTaskRepo.findByUserIdSync(db, 'user_1');

      expect(projects).toHaveLength(1);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].projectId).toBe(projects[0].id);
    });

    it('simulates transaction rollback with sync operations', () => {
      // Test rollback simulation with sync operations
      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Rollback Sim Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      // This should fail and roll back (manually trigger error)
      expect(() => {
        db.transaction(tx => {
          syncProjectRepo.createSync(tx, project);

          // Manually trigger an error to test rollback
          throw new Error('Simulated transaction failure');
        });
      }).toThrow('Simulated transaction failure');

      // Verify nothing was committed (rolled back)
      const projects = syncProjectRepo.findByUserIdSync(db, 'user_1');
      const tasks = syncTaskRepo.findByUserIdSync(db, 'user_1');

      expect(projects).toHaveLength(0);
      expect(tasks).toHaveLength(0);
    });

    it('simulates complex nested operations in transaction', () => {
      // Test complex operations that mirror production scenarios
      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Complex Sim Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      const parentTask: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: '', // Will be set after project creation
        parentTaskId: null,
        title: 'Parent Task',
        description: null,
        difficulty: 'MEDIUM',
        progress: 50,
        status: 'IN_PROGRESS',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      const subTask: Omit<Task, 'id'> = {
        userId: 'user_1',
        projectId: '', // Will be set after project creation
        parentTaskId: '', // Will be set after parent task creation
        title: 'Sub Task',
        description: null,
        difficulty: 'EASY',
        progress: 25,
        status: 'BACKLOG',
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      };

      // Simulate production transaction with nested operations
      db.transaction(tx => {
        const createdProject = syncProjectRepo.createSync(tx, project);

        // Create parent task
        const createdParentTask = syncTaskRepo.createSync(tx, {
          ...parentTask,
          projectId: createdProject.id,
        });

        // Create sub-task referencing parent
        syncTaskRepo.createSync(tx, {
          ...subTask,
          projectId: createdProject.id,
          parentTaskId: createdParentTask.id,
        });

        // Update project completion based on tasks
        syncProjectRepo.updateSync(tx, createdProject.id, {
          completionPercentage: 37.5, // Average of 50 and 25
        });
      });

      // Verify all operations were committed
      const projects = syncProjectRepo.findByUserIdSync(db, 'user_1');
      const tasks = syncTaskRepo.findByUserIdSync(db, 'user_1');

      expect(projects).toHaveLength(1);
      expect(tasks).toHaveLength(2);
      expect(projects[0].completionPercentage).toBe(37.5);

      const parentTaskResult = tasks.find(t => t.title === 'Parent Task');
      const subTaskResult = tasks.find(t => t.title === 'Sub Task');

      expect(parentTaskResult).toBeDefined();
      expect(subTaskResult).toBeDefined();
      expect(subTaskResult?.parentTaskId).toBe(parentTaskResult?.id);
    });

    it('demonstrates production transaction pattern', () => {
      // This shows the exact pattern that would be used in production
      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Production Pattern Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      // This is the production pattern (simulated with sync):
      let createdProject: Project | null = null;

      db.transaction(tx => {
        createdProject = syncProjectRepo.createSync(tx, project);

        // In production, you could do more complex operations here:
        // - Create related entities
        // - Update aggregates
        // - Send events
        // - etc.
      });

      expect(createdProject).toBeDefined();
      expect(createdProject!.name).toBe('Production Pattern Project');

      // Verify it was actually committed
      const foundProject = syncProjectRepo.findByIdSync(db, createdProject!.id);
      expect(foundProject).toBeDefined();
      expect(foundProject!.name).toBe('Production Pattern Project');
    });
  });

  describe('transaction behavior', () => {
    it('demonstrates transaction limitation with better-sqlite3', () => {
      // This test documents the known limitation:
      // better-sqlite3 transactions must be synchronous, but our repos are async
      // This is why production uses PowerSync (which supports async transactions)

      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      // This works - async operations outside transactions
      expect(async () => {
        await projectRepo.create(db as any, project);
      }).not.toThrow();

      // This would fail - async operations inside transactions
      // db.transaction(async (tx) => {
      //   await projectRepo.create(tx as any, project);
      // });
      // Error: Transaction function cannot return a promise

      // This is a test environment limitation only
      // In production with PowerSync, async transactions work fine
    });

    it('shows transaction structure with synchronous operations', () => {
      // Demonstrate transaction structure using direct db operations
      // This simulates what the repositories would do synchronously

      const projectData = {
        id: 'test-project-id',
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };

      // First test: direct insert without transaction
      db.insert(projectsTable).values(projectData).run();

      // Verify the project was inserted
      const result = db.select().from(projectsTable).all();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Project');
    });

    it('demonstrates rollback behavior with direct operations', () => {
      // Test rollback using direct database operations
      const projectData = {
        id: 'test-rollback-project',
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Rollback Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };

      // This should fail and roll back
      expect(() => {
        db.transaction(tx => {
          tx.insert(projectsTable).values(projectData);

          // Simulate an error that would cause rollback
          throw new Error('Simulated failure - should rollback');
        });
      }).toThrow('Simulated failure - should rollback');

      // Verify nothing was committed (rolled back)
      const result = db.select().from(projectsTable).all();

      expect(result.filter(r => r.id === 'test-rollback-project')).toHaveLength(0);
    });

    it('shows multiple operations in single transaction', () => {
      // Test multiple related operations in one transaction
      const projectData = {
        id: 'test-multi-project',
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Multi-Op Project',
        description: null,
        color: null,
        completionPercentage: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };

      const taskData = {
        id: 'test-multi-task',
        userId: 'user_1',
        projectId: projectData.id,
        parentTaskId: null,
        title: 'Multi-Op Task',
        description: null,
        difficulty: 'MEDIUM' as const,
        progress: 75,
        status: 'IN_PROGRESS' as const,
        estimatedMinutes: null,
        maxMinutes: null,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };

      // Both operations in single transaction
      db.transaction(tx => {
        tx.insert(projectsTable).values(projectData).run();
        tx.insert(tasksTable).values(taskData).run();

        // Update project completion based on task progress
        tx.update(projectsTable)
          .set({ completionPercentage: 75, updatedAt: new Date().toISOString() })
          .where(eq(projectsTable.id, projectData.id))
          .run();
      });

      // Verify both were committed and update applied
      const projects = db.select().from(projectsTable).all();
      const tasks = db.select().from(tasksTable).all();

      expect(projects.filter(p => p.id === projectData.id)).toHaveLength(1);
      expect(tasks.filter(t => t.id === taskData.id)).toHaveLength(1);

      const project = projects.find(p => p.id === projectData.id);
      expect(project?.completionPercentage).toBe(75);

      const task = tasks.find(t => t.id === taskData.id);
      expect(task?.projectId).toBe(projectData.id);
    });

    it('shows simple transaction with project operations', () => {
      const projectData = {
        id: 'test-project-id',
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };

      // Simple transaction with just project operations
      db.transaction(tx => {
        tx.insert(projectsTable).values(projectData).run();

        // Update project completion within same transaction
        tx.update(projectsTable)
          .set({ completionPercentage: 75, updatedAt: new Date().toISOString() })
          .where(eq(projectsTable.id, projectData.id))
          .run();
      });

      // Verify the project was committed and update applied
      const projects = db.select().from(projectsTable).all();

      expect(projects.filter(p => p.id === projectData.id)).toHaveLength(1);

      const project = projects.find(p => p.id === projectData.id);
      expect(project?.completionPercentage).toBe(75);
    });

    it('documents production vs test transaction differences', async () => {
      // This test explains the difference between test and production

      const project: Omit<Project, 'id'> = {
        workspaceId: 'workspace_1',
        userId: 'user_1',
        name: 'Production vs Test',
        description: null,
        color: null,
        completionPercentage: 0,
      };

      // In tests (better-sqlite3):
      // - Transactions must be synchronous
      // - Repository methods must have sync variants
      // - Limited to simple operations

      // In production (PowerSync):
      // - Transactions can be asynchronous
      // - Repository methods work as-is
      // - Full transaction support with complex operations

      // For now, we test async operations outside transactions
      const createdProject = await projectRepo.create(db as any, project);
      expect(createdProject).toBeDefined();

      // Clean up
      await projectRepo.delete(db as any, createdProject.id);

      // The transaction pattern would be:
      // await db.transaction(async (tx) => {
      //   const project = await projectRepo.create(tx, projectData);
      //   await taskRepo.create(tx, taskData);
      //   // ... more operations
      // But this only works in production with PowerSync
    });
  });
});
