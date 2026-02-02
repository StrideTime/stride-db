/**
 * Internal Drizzle-inferred types
 * These types are NEVER exported outside of stride-db
 * Repositories use these internally and map to/from domain types
 */

import {
  users,
  roles,
  userSubscriptions,
  subscriptionHistory,
  workspaces,
  workspaceMembers,
  projects,
  taskTypes,
  tasks,
  timeEntries,
  scheduledEvents,
  pointsLedger,
  dailySummaries,
  userPreferences,
} from './schema';

// User types
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// Role types
export type RoleRow = typeof roles.$inferSelect;
export type NewRoleRow = typeof roles.$inferInsert;

// UserSubscription types
export type UserSubscriptionRow = typeof userSubscriptions.$inferSelect;
export type NewUserSubscriptionRow = typeof userSubscriptions.$inferInsert;

// SubscriptionHistory types
export type SubscriptionHistoryRow = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistoryRow = typeof subscriptionHistory.$inferInsert;

// Workspace types
export type WorkspaceRow = typeof workspaces.$inferSelect;
export type NewWorkspaceRow = typeof workspaces.$inferInsert;

// WorkspaceMember types
export type WorkspaceMemberRow = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMemberRow = typeof workspaceMembers.$inferInsert;

// Project types
export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;

// TaskType types
export type TaskTypeRow = typeof taskTypes.$inferSelect;
export type NewTaskTypeRow = typeof taskTypes.$inferInsert;

// Task types
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

// TimeEntry types
export type TimeEntryRow = typeof timeEntries.$inferSelect;
export type NewTimeEntryRow = typeof timeEntries.$inferInsert;

// ScheduledEvent types
export type ScheduledEventRow = typeof scheduledEvents.$inferSelect;
export type NewScheduledEventRow = typeof scheduledEvents.$inferInsert;

// PointsLedger types
export type PointsLedgerRow = typeof pointsLedger.$inferSelect;
export type NewPointsLedgerRow = typeof pointsLedger.$inferInsert;

// DailySummary types
export type DailySummaryRow = typeof dailySummaries.$inferSelect;
export type NewDailySummaryRow = typeof dailySummaries.$inferInsert;

// UserPreferences types
export type UserPreferencesRow = typeof userPreferences.$inferSelect;
export type NewUserPreferencesRow = typeof userPreferences.$inferInsert;
