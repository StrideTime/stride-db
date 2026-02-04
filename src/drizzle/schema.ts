/**
 * Stride Database Schema (Drizzle ORM)
 *
 * Single source of truth for all database tables and relations.
 * This schema is used for:
 * - Migrations (drizzle-kit generates migrations from this)
 * - Query building (drizzle-orm uses this for type-safe queries)
 *
 * NOTE: All enums are imported from @stridetime/types to maintain decoupling.
 * The schema consumes domain types, never defines them.
 */

import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import type {
  SubscriptionStatus,
  BillingPeriod,
  SubscriptionChangeReason,
  WorkspaceType,
  WorkspaceMemberRole,
  TaskDifficulty,
  TaskStatus,
  ScheduledEventType,
  Theme,
  PlanningMode,
  PointsReason,
} from '@stridetime/types';

// ============================================================================
// USERS TABLE
// ============================================================================

export const usersTable = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    avatarUrl: text('avatar_url'),
    timezone: text('timezone').notNull().default('UTC'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  },
  table => [index('idx_users_email').on(table.email)]
);

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  subscription: one(userSubscriptionsTable, {
    fields: [usersTable.id],
    references: [userSubscriptionsTable.userId],
  }),
  subscriptionHistory: many(subscriptionHistoryTable),
  ownedWorkspaces: many(workspacesTable),
  workspaceMemberships: many(workspaceMembersTable),
  projects: many(projectsTable),
  tasks: many(tasksTable),
  taskTypes: many(taskTypesTable),
  timeEntries: many(timeEntriesTable),
  scheduledEvents: many(scheduledEventsTable),
  dailySummaries: many(dailySummariesTable),
  preferences: one(userPreferencesTable, {
    fields: [usersTable.id],
    references: [userPreferencesTable.userId],
  }),
  pointsLedger: many(pointsLedgerTable),
}));

// ============================================================================
// ROLES TABLE
// ============================================================================

export const rolesTable = sqliteTable('roles', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  description: text('description'),

  // Feature flags
  cloudSync: integer('cloud_sync', { mode: 'boolean' }).notNull().default(false),
  mobileApp: integer('mobile_app', { mode: 'boolean' }).notNull().default(false),
  teamWorkspaces: integer('team_workspaces', { mode: 'boolean' }).notNull().default(false),
  exportReports: integer('export_reports', { mode: 'boolean' }).notNull().default(false),
  apiAccess: integer('api_access', { mode: 'boolean' }).notNull().default(false),
  sso: integer('sso', { mode: 'boolean' }).notNull().default(false),
  auditLogs: integer('audit_logs', { mode: 'boolean' }).notNull().default(false),
  customIntegrations: integer('custom_integrations', { mode: 'boolean' }).notNull().default(false),
  prioritySupport: integer('priority_support', { mode: 'boolean' }).notNull().default(false),

  // Resource limits (null = unlimited)
  maxWorkspaces: integer('max_workspaces'),
  maxProjects: integer('max_projects'),
  maxTeamMembers: integer('max_team_members'),
  maxApiCallsPerDay: integer('max_api_calls_per_day'),
  maxStorageMb: integer('max_storage_mb'),

  // Metadata
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const rolesRelations = relations(rolesTable, ({ many }) => ({
  subscriptions: many(userSubscriptionsTable),
}));

// ============================================================================
// USER SUBSCRIPTIONS TABLE
// ============================================================================

export const userSubscriptionsTable = sqliteTable(
  'user_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().unique(),
    roleId: text('role_id').notNull(),

    // Subscription status
    status: text('status').notNull().$type<SubscriptionStatus>(),

    // Pricing
    priceCents: integer('price_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    billingPeriod: text('billing_period').notNull().$type<BillingPeriod>(),

    // Stripe integration
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripePriceId: text('stripe_price_id'),

    // Dates
    startedAt: text('started_at').notNull(),
    currentPeriodStart: text('current_period_start'),
    currentPeriodEnd: text('current_period_end'),
    canceledAt: text('canceled_at'),
    trialEndsAt: text('trial_ends_at'),

    // Grandfathering
    isGrandfathered: integer('is_grandfathered', { mode: 'boolean' }).notNull().default(false),
    grandfatheredReason: text('grandfathered_reason'),

    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [
    index('idx_user_subscriptions_user_id').on(table.userId),
    index('idx_user_subscriptions_role_id').on(table.roleId),
    index('idx_user_subscriptions_status').on(table.status),
  ]
);

export const userSubscriptionsRelations = relations(userSubscriptionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userSubscriptionsTable.userId],
    references: [usersTable.id],
  }),
  role: one(rolesTable, {
    fields: [userSubscriptionsTable.roleId],
    references: [rolesTable.id],
  }),
}));

// ============================================================================
// SUBSCRIPTION HISTORY TABLE
// ============================================================================

export const subscriptionHistoryTable = sqliteTable(
  'subscription_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    oldRoleId: text('old_role_id'),
    newRoleId: text('new_role_id').notNull(),
    oldPriceCents: integer('old_price_cents'),
    newPriceCents: integer('new_price_cents').notNull(),
    reason: text('reason').notNull().$type<SubscriptionChangeReason>(),
    changedAt: text('changed_at').notNull(),
  },
  table => [index('idx_subscription_history_user_id').on(table.userId)]
);

export const subscriptionHistoryRelations = relations(subscriptionHistoryTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [subscriptionHistoryTable.userId],
    references: [usersTable.id],
  }),
}));

// ============================================================================
// WORKSPACES TABLE
// ============================================================================

export const workspacesTable = sqliteTable(
  'workspaces',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull().$type<WorkspaceType>(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  },
  table => [index('idx_workspaces_owner_user_id').on(table.ownerUserId)]
);

export const workspacesRelations = relations(workspacesTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [workspacesTable.ownerUserId],
    references: [usersTable.id],
  }),
  members: many(workspaceMembersTable),
  projects: many(projectsTable),
}));

// ============================================================================
// WORKSPACE MEMBERS TABLE
// ============================================================================

export const workspaceMembersTable = sqliteTable(
  'workspace_members',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').notNull().$type<WorkspaceMemberRole>(),
    invitedBy: text('invited_by'),
    joinedAt: text('joined_at').notNull(),
  },
  table => [
    uniqueIndex('idx_workspace_members_workspace_user').on(table.workspaceId, table.userId),
    index('idx_workspace_members_user_id').on(table.userId),
  ]
);

export const workspaceMembersRelations = relations(workspaceMembersTable, ({ one }) => ({
  workspace: one(workspacesTable, {
    fields: [workspaceMembersTable.workspaceId],
    references: [workspacesTable.id],
  }),
  user: one(usersTable, {
    fields: [workspaceMembersTable.userId],
    references: [usersTable.id],
  }),
}));

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projectsTable = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color'),
    completionPercentage: integer('completion_percentage').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  },
  table => [
    index('idx_projects_workspace_id').on(table.workspaceId),
    index('idx_projects_user_id').on(table.userId),
    index('idx_projects_deleted').on(table.deleted),
  ]
);

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  workspace: one(workspacesTable, {
    fields: [projectsTable.workspaceId],
    references: [workspacesTable.id],
  }),
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  tasks: many(tasksTable),
}));

// ============================================================================
// TASK TYPES TABLE
// ============================================================================

export const taskTypesTable = sqliteTable(
  'task_types',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id'),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    icon: text('icon'),
    color: text('color'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  table => [
    index('idx_task_types_user_id').on(table.userId),
    index('idx_task_types_workspace_id').on(table.workspaceId),
  ]
);

export const taskTypesRelations = relations(taskTypesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [taskTypesTable.userId],
    references: [usersTable.id],
  }),
  tasks: many(tasksTable),
}));

// ============================================================================
// TASKS TABLE
// ============================================================================

export const tasksTable = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    projectId: text('project_id').notNull(),
    parentTaskId: text('parent_task_id'),

    title: text('title').notNull(),
    description: text('description'),
    difficulty: text('difficulty').notNull().$type<TaskDifficulty>(),
    progress: integer('progress').notNull().default(0),
    status: text('status').notNull().default('BACKLOG').$type<TaskStatus>(),

    // Time tracking
    estimatedMinutes: integer('estimated_minutes'),
    maxMinutes: integer('max_minutes'),
    actualMinutes: integer('actual_minutes').notNull().default(0),

    // Planning
    plannedForDate: text('planned_for_date'),
    dueDate: text('due_date'),
    taskTypeId: text('task_type_id'),

    // Timestamps
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  },
  table => [
    index('idx_tasks_user_id').on(table.userId),
    index('idx_tasks_project_id').on(table.projectId),
    index('idx_tasks_parent_task_id').on(table.parentTaskId),
    index('idx_tasks_status').on(table.status),
    index('idx_tasks_planned_for_date').on(table.plannedForDate),
    index('idx_tasks_deleted').on(table.deleted),
  ]
);

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [tasksTable.userId],
    references: [usersTable.id],
  }),
  project: one(projectsTable, {
    fields: [tasksTable.projectId],
    references: [projectsTable.id],
  }),
  taskType: one(taskTypesTable, {
    fields: [tasksTable.taskTypeId],
    references: [taskTypesTable.id],
  }),
  parentTask: one(tasksTable, {
    fields: [tasksTable.parentTaskId],
    references: [tasksTable.id],
    relationName: 'subTasks',
  }),
  subTasks: many(tasksTable, {
    relationName: 'subTasks',
  }),
  timeEntries: many(timeEntriesTable),
  scheduledEvents: many(scheduledEventsTable),
  pointsLedger: many(pointsLedgerTable),
}));

// ============================================================================
// TIME ENTRIES TABLE
// ============================================================================

export const timeEntriesTable = sqliteTable(
  'time_entries',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    userId: text('user_id').notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    createdAt: text('created_at').notNull(),
  },
  table => [
    index('idx_time_entries_task_id').on(table.taskId),
    index('idx_time_entries_user_id').on(table.userId),
    index('idx_time_entries_started_at').on(table.startedAt),
  ]
);

export const timeEntriesRelations = relations(timeEntriesTable, ({ one, many }) => ({
  task: one(tasksTable, {
    fields: [timeEntriesTable.taskId],
    references: [tasksTable.id],
  }),
  user: one(usersTable, {
    fields: [timeEntriesTable.userId],
    references: [usersTable.id],
  }),
  pointsLedger: many(pointsLedgerTable),
}));

// ============================================================================
// SCHEDULED EVENTS TABLE
// ============================================================================

export const scheduledEventsTable = sqliteTable(
  'scheduled_events',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id'),
    userId: text('user_id').notNull(),
    startTime: text('start_time').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    label: text('label').notNull(),
    type: text('type').notNull().$type<ScheduledEventType>(),
    externalId: text('external_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [
    index('idx_scheduled_events_user_id').on(table.userId),
    index('idx_scheduled_events_start_time').on(table.startTime),
    index('idx_scheduled_events_external_id').on(table.externalId),
  ]
);

export const scheduledEventsRelations = relations(scheduledEventsTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [scheduledEventsTable.taskId],
    references: [tasksTable.id],
  }),
  user: one(usersTable, {
    fields: [scheduledEventsTable.userId],
    references: [usersTable.id],
  }),
}));

// ============================================================================
// POINTS LEDGER TABLE
// ============================================================================

export const pointsLedgerTable = sqliteTable(
  'points_ledger',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    taskId: text('task_id'),
    timeEntryId: text('time_entry_id'),
    points: integer('points').notNull(),
    reason: text('reason').notNull().$type<PointsReason>(),
    description: text('description'),
    createdAt: text('created_at').notNull(),
  },
  table => [
    index('idx_points_ledger_user_id').on(table.userId),
    index('idx_points_ledger_user_created').on(table.userId, table.createdAt),
    index('idx_points_ledger_task_id').on(table.taskId),
  ]
);

export const pointsLedgerRelations = relations(pointsLedgerTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [pointsLedgerTable.userId],
    references: [usersTable.id],
  }),
  task: one(tasksTable, {
    fields: [pointsLedgerTable.taskId],
    references: [tasksTable.id],
  }),
  timeEntry: one(timeEntriesTable, {
    fields: [pointsLedgerTable.timeEntryId],
    references: [timeEntriesTable.id],
  }),
}));

// ============================================================================
// DAILY SUMMARIES TABLE
// ============================================================================

export const dailySummariesTable = sqliteTable(
  'daily_summaries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    tasksCompleted: integer('tasks_completed').notNull().default(0),
    tasksWorkedOn: integer('tasks_worked_on').notNull().default(0),
    totalPoints: integer('total_points').notNull().default(0),
    focusMinutes: integer('focus_minutes').notNull().default(0),
    efficiencyRating: real('efficiency_rating').notNull().default(0.0),
    standoutMoment: text('standout_moment'),
    createdAt: text('created_at').notNull(),
  },
  table => [
    uniqueIndex('idx_daily_summaries_user_date').on(table.userId, table.date),
    index('idx_daily_summaries_user_id_date').on(table.userId, table.date),
  ]
);

export const dailySummariesRelations = relations(dailySummariesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [dailySummariesTable.userId],
    references: [usersTable.id],
  }),
}));

// ============================================================================
// USER PREFERENCES TABLE
// ============================================================================

export const userPreferencesTable = sqliteTable('user_preferences', {
  userId: text('user_id').primaryKey(),

  theme: text('theme').notNull().default('SYSTEM').$type<Theme>(),
  planningMode: text('planning_mode').notNull().default('WEEKLY').$type<PlanningMode>(),

  checkInFrequency: integer('check_in_frequency').notNull().default(30),
  checkInEnabled: integer('check_in_enabled', { mode: 'boolean' }).notNull().default(true),

  endOfDaySummaryTime: text('end_of_day_summary_time').notNull().default('17:00'),
  endOfDaySummaryEnabled: integer('end_of_day_summary_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),

  autoPauseMinutes: integer('auto_pause_minutes').notNull().default(10),
  autoPauseEnabled: integer('auto_pause_enabled', { mode: 'boolean' }).notNull().default(true),

  breakReminderEnabled: integer('break_reminder_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  breakReminderMinutes: integer('break_reminder_minutes').notNull().default(90),

  updatedAt: text('updated_at').notNull(),
});

export const userPreferencesRelations = relations(userPreferencesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userPreferencesTable.userId],
    references: [usersTable.id],
  }),
}));

// ============================================================================
