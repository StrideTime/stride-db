CREATE TABLE `daily_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`tasks_completed` integer DEFAULT 0 NOT NULL,
	`tasks_worked_on` integer DEFAULT 0 NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`focus_minutes` integer DEFAULT 0 NOT NULL,
	`efficiency_rating` real DEFAULT 0 NOT NULL,
	`standout_moment` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_summaries_user_date` ON `daily_summaries` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_summaries_user_id_date` ON `daily_summaries` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `points_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text,
	`time_entry_id` text,
	`points` integer NOT NULL,
	`reason` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_points_ledger_user_id` ON `points_ledger` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_points_ledger_user_created` ON `points_ledger` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_points_ledger_task_id` ON `points_ledger` (`task_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text,
	`completion_percentage` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_workspace_id` ON `projects` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_projects_user_id` ON `projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_projects_deleted` ON `projects` (`deleted`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`cloud_sync` integer DEFAULT false NOT NULL,
	`mobile_app` integer DEFAULT false NOT NULL,
	`team_workspaces` integer DEFAULT false NOT NULL,
	`export_reports` integer DEFAULT false NOT NULL,
	`api_access` integer DEFAULT false NOT NULL,
	`sso` integer DEFAULT false NOT NULL,
	`audit_logs` integer DEFAULT false NOT NULL,
	`custom_integrations` integer DEFAULT false NOT NULL,
	`priority_support` integer DEFAULT false NOT NULL,
	`max_workspaces` integer,
	`max_projects` integer,
	`max_team_members` integer,
	`max_api_calls_per_day` integer,
	`max_storage_mb` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scheduled_events` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`user_id` text NOT NULL,
	`start_time` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`external_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scheduled_events_user_id` ON `scheduled_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_events_start_time` ON `scheduled_events` (`start_time`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_events_external_id` ON `scheduled_events` (`external_id`);--> statement-breakpoint
CREATE TABLE `subscription_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`old_role_id` text,
	`new_role_id` text NOT NULL,
	`old_price_cents` integer,
	`new_price_cents` integer NOT NULL,
	`reason` text NOT NULL,
	`changed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_subscription_history_user_id` ON `subscription_history` (`user_id`);--> statement-breakpoint
CREATE TABLE `task_types` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`is_default` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_task_types_user_id` ON `task_types` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_task_types_workspace_id` ON `task_types` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`parent_task_id` text,
	`title` text NOT NULL,
	`description` text,
	`difficulty` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'BACKLOG' NOT NULL,
	`estimated_minutes` integer,
	`max_minutes` integer,
	`actual_minutes` integer DEFAULT 0 NOT NULL,
	`planned_for_date` text,
	`due_date` text,
	`task_type_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	`deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_user_id` ON `tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_project_id` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_parent_task_id` ON `tasks` (`parent_task_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_planned_for_date` ON `tasks` (`planned_for_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_deleted` ON `tasks` (`deleted`);--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_time_entries_task_id` ON `time_entries` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_user_id` ON `time_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_started_at` ON `time_entries` (`started_at`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'SYSTEM' NOT NULL,
	`planning_mode` text DEFAULT 'WEEKLY' NOT NULL,
	`check_in_frequency` integer DEFAULT 30 NOT NULL,
	`check_in_enabled` integer DEFAULT true NOT NULL,
	`end_of_day_summary_time` text DEFAULT '17:00' NOT NULL,
	`end_of_day_summary_enabled` integer DEFAULT true NOT NULL,
	`auto_pause_minutes` integer DEFAULT 10 NOT NULL,
	`auto_pause_enabled` integer DEFAULT true NOT NULL,
	`break_reminder_enabled` integer DEFAULT true NOT NULL,
	`break_reminder_minutes` integer DEFAULT 90 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`status` text NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`billing_period` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_price_id` text,
	`started_at` text NOT NULL,
	`current_period_start` text,
	`current_period_end` text,
	`canceled_at` text,
	`trial_ends_at` text,
	`is_grandfathered` integer DEFAULT false NOT NULL,
	`grandfathered_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_subscriptions_user_id_unique` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_subscriptions_user_id` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_subscriptions_role_id` ON `user_subscriptions` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_user_subscriptions_status` ON `user_subscriptions` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`avatar_url` text,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`invited_by` text,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_members_workspace_user` ON `workspace_members` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_workspace_members_user_id` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspaces_owner_user_id` ON `workspaces` (`owner_user_id`);