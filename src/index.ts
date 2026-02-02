/**
 * @stridetime/db - Public API
 *
 * This package provides a local-first database layer with PowerSync + Drizzle.
 * The public API is intentionally minimal and repository-first.
 *
 * What's exported:
 * - Database lifecycle functions (init, get, close, sync)
 * - Repositories (Task, Project, Workspace)
 * - Utility functions (generateId, now, today)
 *
 * What's NOT exported:
 * - Drizzle schema or tables
 * - Drizzle operators (eq, and, etc.)
 * - Drizzle inferred types
 * - PowerSync internals
 *
 * For advanced use cases requiring custom queries, consumers can:
 * 1. Use getDatabase() to get the DB instance
 * 2. Import Drizzle operators from 'drizzle-orm'
 * 3. Write custom queries and cast results to domain types
 */

// ============================================================================
// DATABASE LIFECYCLE
// ============================================================================

export {
  // Initialization
  initDatabase,
  getDatabase,
  isDatabaseInitialized,
  closeDatabase,

  // Sync management
  connectSync,
  disconnectSync,
  isSyncEnabled,
  getSyncStatus,
  onSyncStatusChange,

  // Types
  type StrideDatabase,
  type DatabaseConfig,
  type LocalDatabaseConfig,
  type SyncDatabaseConfig,
  type SyncStatus,
  type SyncState,

  // Connector (for auth)
  SupabaseConnector,
  getPowerSyncDatabase,
  getConnector,
} from './db';

// ============================================================================
// REPOSITORIES
// ============================================================================

export {
  TaskRepository,
  taskRepo,
  ProjectRepository,
  projectRepo,
  WorkspaceRepository,
  workspaceRepo,
  TimeEntryRepository,
  timeEntryRepo,
  UserRepository,
  userRepo,
  TaskTypeRepository,
  taskTypeRepo,
  DailySummaryRepository,
  dailySummaryRepo,
} from './repositories';

// ============================================================================
// UTILITIES
// ============================================================================

export { generateId, now, today } from './db/utils';
