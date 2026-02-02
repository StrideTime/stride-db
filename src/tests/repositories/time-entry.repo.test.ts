/**
 * TimeEntry Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { timeEntryRepo } from '../../repositories/time-entry.repo';
import { createTestDb } from '../setup';
import type { TimeEntry } from '@stridetime/types';

describe('TimeEntryRepository', () => {
  let db: any;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('create', () => {
    it('creates a time entry', async () => {
      const entry: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      const created = await timeEntryRepo.create(db, entry);

      expect(created.id).toBeTruthy();
      expect(created.taskId).toBe('task_1');
      expect(created.userId).toBe('user_1');
      expect(created.endedAt).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns time entry when found', async () => {
      const entry: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      const created = await timeEntryRepo.create(db, entry);
      const found = await timeEntryRepo.findById(db, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const found = await timeEntryRepo.findById(db, 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByTaskId', () => {
    it('returns all entries for a task', async () => {
      const entry1: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      const entry2: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };

      await timeEntryRepo.create(db, entry1);
      await timeEntryRepo.create(db, entry2);

      const entries = await timeEntryRepo.findByTaskId(db, 'task_1');

      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.taskId === 'task_1')).toBe(true);
    });
  });

  describe('findActive', () => {
    it('returns active (ongoing) time entry', async () => {
      const activeEntry: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      const completedEntry: Omit<TimeEntry, 'id'> = {
        taskId: 'task_2',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };

      await timeEntryRepo.create(db, completedEntry);
      const created = await timeEntryRepo.create(db, activeEntry);

      const active = await timeEntryRepo.findActive(db, 'user_1');

      expect(active).toBeDefined();
      expect(active?.id).toBe(created.id);
      expect(active?.endedAt).toBeNull();
    });

    it('returns null when no active entry', async () => {
      const active = await timeEntryRepo.findActive(db, 'user_1');
      expect(active).toBeNull();
    });
  });

  describe('stop', () => {
    it('stops a time entry by setting endedAt', async () => {
      const entry: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      const created = await timeEntryRepo.create(db, entry);
      const endTime = new Date().toISOString();
      const stopped = await timeEntryRepo.stop(db, created.id, endTime);

      expect(stopped.endedAt).toBe(endTime);
    });
  });

  describe('calculateTotalMinutes', () => {
    it('calculates total minutes for a task', async () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end1 = new Date('2024-01-01T10:30:00Z'); // 30 min
      const end2 = new Date('2024-01-01T11:15:00Z'); // 75 min

      const entry1: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: start.toISOString(),
        endedAt: end1.toISOString(),
      };

      const entry2: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: start.toISOString(),
        endedAt: end2.toISOString(),
      };

      await timeEntryRepo.create(db, entry1);
      await timeEntryRepo.create(db, entry2);

      const totalMinutes = await timeEntryRepo.calculateTotalMinutes(db, 'task_1');

      expect(totalMinutes).toBe(105); // 30 + 75
    });

    it('ignores ongoing entries without endedAt', async () => {
      const entry: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      await timeEntryRepo.create(db, entry);

      const totalMinutes = await timeEntryRepo.calculateTotalMinutes(db, 'task_1');

      expect(totalMinutes).toBe(0);
    });
  });

  describe('mapper integrity', () => {
    it('excludes DB-only fields', async () => {
      const entry: Omit<TimeEntry, 'id'> = {
        taskId: 'task_1',
        userId: 'user_1',
        startedAt: new Date().toISOString(),
        endedAt: null,
      };

      const created = await timeEntryRepo.create(db, entry);

      expect(created).not.toHaveProperty('createdAt');
    });
  });
});
