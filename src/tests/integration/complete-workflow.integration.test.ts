/**
 * Complete Workflow Integration Tests
 *
 * Tests realistic user workflows that span multiple repositories.
 * These tests ensure repositories work together correctly in real scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDatabase } from '../setup';
import { userRepo } from '../../repositories/user.repo';
import { workspaceRepo } from '../../repositories/workspace.repo';
import { projectRepo } from '../../repositories/project.repo';
import { taskRepo } from '../../repositories/task.repo';
import { taskTypeRepo } from '../../repositories/task-type.repo';
import { timeEntryRepo } from '../../repositories/time-entry.repo';
import { dailySummaryRepo } from '../../repositories/daily-summary.repo';
import type {
  User,
  Workspace,
  Project,
  Task,
  TaskType,
  TimeEntry,
  DailySummary,
} from '@stridetime/types';

describe('Complete Workflow Integration Tests', () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('User Onboarding Flow', () => {
    it('should complete full user onboarding with workspace and default task types', async () => {
      // Step 1: Create new user
      const userData: Omit<User, 'id'> = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'America/New_York',
      };

      const user = await userRepo.create(db as any, userData);
      expect(user.id).toBeTruthy();
      expect(user.email).toBe('newuser@example.com');

      // Step 2: Create personal workspace
      const workspaceData: Omit<Workspace, 'id'> = {
        ownerUserId: user.id,
        name: 'Personal Workspace',
        type: 'PERSONAL',
      };

      const workspace = await workspaceRepo.create(db as any, workspaceData);
      expect(workspace.id).toBeTruthy();
      expect(workspace.ownerUserId).toBe(user.id);

      // Step 3: Create default task types
      const taskTypeData: Omit<TaskType, 'id'>[] = [
        {
          workspaceId: null,
          userId: user.id,
          name: 'Work',
          icon: '💼',
          color: '#3B82F6',
          isDefault: true,
          displayOrder: 0,
        },
        {
          workspaceId: null,
          userId: user.id,
          name: 'Personal',
          icon: '🏠',
          color: '#10B981',
          isDefault: false,
          displayOrder: 1,
        },
        {
          workspaceId: null,
          userId: user.id,
          name: 'Learning',
          icon: '📚',
          color: '#8B5CF6',
          isDefault: false,
          displayOrder: 2,
        },
      ];

      const taskTypes = await Promise.all(
        taskTypeData.map(data => taskTypeRepo.create(db as any, data))
      );

      expect(taskTypes).toHaveLength(3);
      expect(taskTypes.filter(t => t.isDefault)).toHaveLength(1);

      // Step 4: Create initial project
      const projectData: Omit<Project, 'id'> = {
        workspaceId: workspace.id,
        userId: user.id,
        name: 'Getting Started',
        description: 'Initial project to learn the system',
        color: '#3B82F6',
        completionPercentage: 0,
      };

      const project = await projectRepo.create(db as any, projectData);
      expect(project.id).toBeTruthy();
      expect(project.workspaceId).toBe(workspace.id);

      // Verify all entities are connected
      const userProjects = await projectRepo.findByUserId(db as any, user.id);
      expect(userProjects).toHaveLength(1);
      expect(userProjects[0].id).toBe(project.id);

      const userTaskTypes = await taskTypeRepo.findByUser(db as any, user.id);
      expect(userTaskTypes).toHaveLength(3);
    });
  });

  describe('Task Management Workflow', () => {
    it('should complete task creation, time tracking, and completion flow', async () => {
      // Setup: Create user, workspace, and project
      const user = await userRepo.create(db as any, {
        email: 'taskuser@example.com',
        firstName: 'Task',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      });

      const workspace = await workspaceRepo.create(db as any, {
        ownerUserId: user.id,
        name: 'Work Workspace',
        type: 'PERSONAL',
      });

      const project = await projectRepo.create(db as any, {
        workspaceId: workspace.id,
        userId: user.id,
        name: 'Q1 Goals',
        description: null,
        color: null,
        completionPercentage: 0,
      });

      // Step 1: Create task
      const taskData: Omit<Task, 'id'> = {
        userId: user.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Complete feature implementation',
        description: 'Implement the new dashboard feature',
        difficulty: 'MEDIUM',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: 120,
        maxMinutes: 180,
        actualMinutes: 0,
        plannedForDate: '2024-01-15',
        dueDate: '2024-01-20',
        taskTypeId: null,
        completedAt: null,
      };

      const task = await taskRepo.create(db as any, taskData);
      expect(task.id).toBeTruthy();
      expect(task.status).toBe('BACKLOG');

      // Step 2: Start working on task
      const updatedTask = await taskRepo.update(db as any, task.id, {
        status: 'IN_PROGRESS',
        progress: 10,
      });
      expect(updatedTask.status).toBe('IN_PROGRESS');
      expect(updatedTask.progress).toBe(10);

      // Step 3: Create time entry (start timer)
      const timeEntryData: Omit<TimeEntry, 'id'> = {
        taskId: task.id,
        userId: user.id,
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      const timeEntry = await timeEntryRepo.create(db as any, timeEntryData);
      expect(timeEntry.id).toBeTruthy();
      expect(timeEntry.endedAt).toBeNull();

      // Step 4: Stop time entry
      const endedAt = new Date(Date.now() + 90 * 60 * 1000).toISOString(); // 90 minutes later
      const completedTimeEntry = await timeEntryRepo.stop(db as any, timeEntry.id, endedAt);
      expect(completedTimeEntry.endedAt).toBe(endedAt);

      // Step 5: Update task progress
      const progressTask = await taskRepo.update(db as any, task.id, {
        progress: 75,
        actualMinutes: 90,
      });
      expect(progressTask.progress).toBe(75);
      expect(progressTask.actualMinutes).toBe(90);

      // Step 6: Complete task
      const completedTask = await taskRepo.update(db as any, task.id, {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date().toISOString(),
      });
      expect(completedTask.status).toBe('COMPLETED');
      expect(completedTask.progress).toBe(100);
      expect(completedTask.completedAt).not.toBeNull();

      // Verify task is in completed state
      const foundTask = await taskRepo.findById(db as any, task.id);
      expect(foundTask?.status).toBe('COMPLETED');

      // Verify time entries are linked
      const taskTimeEntries = await timeEntryRepo.findByTaskId(db as any, task.id);
      expect(taskTimeEntries).toHaveLength(1);
      expect(taskTimeEntries[0].id).toBe(timeEntry.id);
    });

    it('should handle parent-child task relationships', async () => {
      // Setup
      const user = await userRepo.create(db as any, {
        email: 'parent@example.com',
        firstName: 'Parent',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      });

      const workspace = await workspaceRepo.create(db as any, {
        ownerUserId: user.id,
        name: 'Work',
        type: 'PERSONAL',
      });

      const project = await projectRepo.create(db as any, {
        workspaceId: workspace.id,
        userId: user.id,
        name: 'Big Project',
        description: null,
        color: null,
        completionPercentage: 0,
      });

      // Create parent task
      const parentTask = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Build New Feature',
        description: 'Large epic task',
        difficulty: 'HARD',
        progress: 0,
        status: 'IN_PROGRESS',
        estimatedMinutes: 480,
        maxMinutes: 600,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      });

      // Create child tasks
      const childTask1 = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: parentTask.id,
        title: 'Design UI mockups',
        description: null,
        difficulty: 'EASY',
        progress: 100,
        status: 'COMPLETED',
        estimatedMinutes: 60,
        maxMinutes: 90,
        actualMinutes: 75,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: new Date().toISOString(),
      });

      const childTask2 = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: parentTask.id,
        title: 'Implement backend API',
        description: null,
        difficulty: 'MEDIUM',
        progress: 50,
        status: 'IN_PROGRESS',
        estimatedMinutes: 180,
        maxMinutes: 240,
        actualMinutes: 120,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      });

      const childTask3 = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: parentTask.id,
        title: 'Write tests',
        description: null,
        difficulty: 'MEDIUM',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: 120,
        maxMinutes: 150,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      });

      // Verify parent-child relationships
      const childTasks = await taskRepo.findSubtasks(db as any, parentTask.id);
      expect(childTasks).toHaveLength(3);
      expect(childTasks.map(t => t.id)).toContain(childTask1.id);
      expect(childTasks.map(t => t.id)).toContain(childTask2.id);
      expect(childTasks.map(t => t.id)).toContain(childTask3.id);

      // Calculate aggregate progress
      const totalProgress = childTasks.reduce((sum, t) => sum + t.progress, 0);
      const avgProgress = Math.round(totalProgress / childTasks.length);
      expect(avgProgress).toBe(50); // (100 + 50 + 0) / 3 = 50

      // Update parent task with calculated progress
      await taskRepo.update(db as any, parentTask.id, {
        progress: avgProgress,
      });

      const updatedParent = await taskRepo.findById(db as any, parentTask.id);
      expect(updatedParent?.progress).toBe(50);
    });
  });

  describe('Daily Summary Workflow', () => {
    it('should create daily summary from completed tasks and time entries', async () => {
      // Setup
      const user = await userRepo.create(db as any, {
        email: 'summary@example.com',
        firstName: 'Summary',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      });

      const workspace = await workspaceRepo.create(db as any, {
        ownerUserId: user.id,
        name: 'Work',
        type: 'PERSONAL',
      });

      const project = await projectRepo.create(db as any, {
        workspaceId: workspace.id,
        userId: user.id,
        name: 'Daily Work',
        description: null,
        color: null,
        completionPercentage: 0,
      });

      // Create and complete multiple tasks
      const today = new Date().toISOString().split('T')[0];

      const task1 = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Morning task',
        description: null,
        difficulty: 'EASY',
        progress: 100,
        status: 'COMPLETED',
        estimatedMinutes: 30,
        maxMinutes: 45,
        actualMinutes: 35,
        plannedForDate: today,
        dueDate: null,
        taskTypeId: null,
        completedAt: new Date().toISOString(),
      });

      const task2 = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Afternoon task',
        description: null,
        difficulty: 'MEDIUM',
        progress: 100,
        status: 'COMPLETED',
        estimatedMinutes: 90,
        maxMinutes: 120,
        actualMinutes: 105,
        plannedForDate: today,
        dueDate: null,
        taskTypeId: null,
        completedAt: new Date().toISOString(),
      });

      const task3 = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Work in progress',
        description: null,
        difficulty: 'HARD',
        progress: 60,
        status: 'IN_PROGRESS',
        estimatedMinutes: 180,
        maxMinutes: 240,
        actualMinutes: 90,
        plannedForDate: today,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      });

      // Create time entries
      const now = new Date();
      const startTime1 = new Date(now.getTime() - 35 * 60 * 1000);
      const startTime2 = new Date(now.getTime() - 105 * 60 * 1000);
      const startTime3 = new Date(now.getTime() - 90 * 60 * 1000);

      await timeEntryRepo.create(db as any, {
        taskId: task1.id,
        userId: user.id,
        startedAt: startTime1.toISOString(),
        endedAt: now.toISOString(),
      });

      await timeEntryRepo.create(db as any, {
        taskId: task2.id,
        userId: user.id,
        startedAt: startTime2.toISOString(),
        endedAt: now.toISOString(),
      });

      await timeEntryRepo.create(db as any, {
        taskId: task3.id,
        userId: user.id,
        startedAt: startTime3.toISOString(),
        endedAt: now.toISOString(),
      });

      // Calculate daily metrics
      const todayTasks = await taskRepo.findByPlannedDate(db as any, user.id, today);
      const completedTasks = todayTasks.filter(t => t.status === 'COMPLETED');

      // Get all time entries for the user (findByDateRange expects ISO datetime format, not just date)
      const allTimeEntries = await timeEntryRepo.findByUserId(db as any, user.id);
      const todayTimeEntries = allTimeEntries.filter(entry => entry.startedAt.startsWith(today));

      // Calculate total focus minutes
      const totalMinutes = todayTimeEntries.reduce((sum, entry) => {
        if (!entry.endedAt) return sum;
        const start = new Date(entry.startedAt).getTime();
        const end = new Date(entry.endedAt).getTime();
        return sum + Math.round((end - start) / (1000 * 60));
      }, 0);

      // Calculate points (simple: 1 point per difficulty level)
      const difficultyPoints = { EASY: 1, MEDIUM: 2, HARD: 3 };
      const totalPoints = completedTasks.reduce((sum, t) => {
        return sum + difficultyPoints[t.difficulty as keyof typeof difficultyPoints];
      }, 0);

      // Calculate efficiency (actual vs estimated)
      const totalEstimated = completedTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
      const totalActual = completedTasks.reduce((sum, t) => sum + t.actualMinutes, 0);
      const efficiencyRating = totalEstimated > 0 ? totalActual / totalEstimated : 1.0;

      // Create daily summary
      const summaryData: Omit<DailySummary, 'id'> = {
        userId: user.id,
        date: today,
        tasksCompleted: completedTasks.length,
        tasksWorkedOn: todayTasks.length,
        totalPoints,
        focusMinutes: totalMinutes,
        efficiencyRating: Math.round(efficiencyRating * 100) / 100,
        standoutMoment: 'Completed two major tasks ahead of schedule!',
      };

      const summary = await dailySummaryRepo.create(db as any, summaryData);

      expect(summary.id).toBeTruthy();
      expect(summary.tasksCompleted).toBe(2);
      expect(summary.tasksWorkedOn).toBe(3);
      expect(summary.totalPoints).toBe(3); // 1 (EASY) + 2 (MEDIUM) = 3
      expect(summary.focusMinutes).toBeGreaterThan(0);

      // Verify summary can be retrieved
      const foundSummary = await dailySummaryRepo.findByDate(db as any, user.id, today);
      expect(foundSummary).not.toBeNull();
      expect(foundSummary?.tasksCompleted).toBe(2);
    });

    it('should track productivity metrics over multiple days', async () => {
      const user = await userRepo.create(db as any, {
        email: 'metrics@example.com',
        firstName: 'Metrics',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      });

      // Create summaries for 7 days
      const summaries = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const summary = await dailySummaryRepo.create(db as any, {
          userId: user.id,
          date: dateStr,
          tasksCompleted: 2 + i, // Increasing productivity
          tasksWorkedOn: 3 + i,
          totalPoints: 5 + i * 2,
          focusMinutes: 120 + i * 15,
          efficiencyRating: 0.8 + i * 0.02,
          standoutMoment: `Day ${7 - i} achievement`,
        });

        summaries.push(summary);
      }

      // Query recent summaries
      const recentSummaries = await dailySummaryRepo.findRecent(db as any, user.id, 7);
      expect(recentSummaries).toHaveLength(7);

      // Calculate average points
      const avgPoints = await dailySummaryRepo.calculateAveragePoints(db as any, user.id, 7);
      expect(avgPoints).toBeGreaterThan(0);

      // Calculate date range metrics
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      const endDate = new Date();

      const totalFocus = await dailySummaryRepo.calculateTotalFocusMinutes(
        db as any,
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      expect(totalFocus).toBeGreaterThan(0);
    });
  });

  describe('Multi-User Workspace Workflow', () => {
    it('should handle shared workspace with multiple users', async () => {
      // Create two users
      const owner = await userRepo.create(db as any, {
        email: 'owner@example.com',
        firstName: 'Workspace',
        lastName: 'Owner',
        avatarUrl: null,
        timezone: 'UTC',
      });

      const member = await userRepo.create(db as any, {
        email: 'member@example.com',
        firstName: 'Team',
        lastName: 'Member',
        avatarUrl: null,
        timezone: 'UTC',
      });

      // Create shared workspace
      const workspace = await workspaceRepo.create(db as any, {
        ownerUserId: owner.id,
        name: 'Team Workspace',
        type: 'TEAM',
      });

      // Create project in shared workspace
      const project = await projectRepo.create(db as any, {
        workspaceId: workspace.id,
        userId: owner.id,
        name: 'Team Project',
        description: 'Collaborative project',
        color: '#3B82F6',
        completionPercentage: 0,
      });

      // Owner creates a task
      const ownerTask = await taskRepo.create(db as any, {
        userId: owner.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Setup project structure',
        description: null,
        difficulty: 'MEDIUM',
        progress: 100,
        status: 'COMPLETED',
        estimatedMinutes: 60,
        maxMinutes: 90,
        actualMinutes: 55,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: new Date().toISOString(),
      });

      // Member creates a task
      const memberTask = await taskRepo.create(db as any, {
        userId: member.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Implement feature',
        description: null,
        difficulty: 'HARD',
        progress: 50,
        status: 'IN_PROGRESS',
        estimatedMinutes: 180,
        maxMinutes: 240,
        actualMinutes: 120,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      });

      // Both users can see project tasks
      const projectTasks = await taskRepo.findByProjectId(db as any, project.id);
      expect(projectTasks).toHaveLength(2);
      expect(projectTasks.map(t => t.userId)).toContain(owner.id);
      expect(projectTasks.map(t => t.userId)).toContain(member.id);

      // Each user sees only their own tasks
      const ownerTasks = await taskRepo.findByUserId(db as any, owner.id);
      expect(ownerTasks).toHaveLength(1);
      expect(ownerTasks[0].id).toBe(ownerTask.id);

      const memberTasks = await taskRepo.findByUserId(db as any, member.id);
      expect(memberTasks).toHaveLength(1);
      expect(memberTasks[0].id).toBe(memberTask.id);
    });
  });

  describe('Data Cleanup and Soft Delete', () => {
    it('should handle soft delete cascading behavior', async () => {
      // Setup
      const user = await userRepo.create(db as any, {
        email: 'cleanup@example.com',
        firstName: 'Cleanup',
        lastName: 'User',
        avatarUrl: null,
        timezone: 'UTC',
      });

      const workspace = await workspaceRepo.create(db as any, {
        ownerUserId: user.id,
        name: 'Test Workspace',
        type: 'PERSONAL',
      });

      const project = await projectRepo.create(db as any, {
        workspaceId: workspace.id,
        userId: user.id,
        name: 'Test Project',
        description: null,
        color: null,
        completionPercentage: 0,
      });

      const task = await taskRepo.create(db as any, {
        userId: user.id,
        projectId: project.id,
        parentTaskId: null,
        title: 'Test Task',
        description: null,
        difficulty: 'EASY',
        progress: 0,
        status: 'BACKLOG',
        estimatedMinutes: 30,
        maxMinutes: 45,
        actualMinutes: 0,
        plannedForDate: null,
        dueDate: null,
        taskTypeId: null,
        completedAt: null,
      });

      // Verify entities exist
      expect(await projectRepo.findById(db as any, project.id)).not.toBeNull();
      expect(await taskRepo.findById(db as any, task.id)).not.toBeNull();

      // Delete project (soft delete)
      await projectRepo.delete(db as any, project.id);

      // Project should not be findable
      expect(await projectRepo.findById(db as any, project.id)).toBeNull();

      // Task should still exist (but ideally would be orphaned or handled by app logic)
      const foundTask = await taskRepo.findById(db as any, task.id);
      expect(foundTask).not.toBeNull();

      // Delete task
      await taskRepo.delete(db as any, task.id);
      expect(await taskRepo.findById(db as any, task.id)).toBeNull();
    });
  });
});
