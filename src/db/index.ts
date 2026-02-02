/**
 * Database layer exports
 * Only DB lifecycle and management functions are exported
 */

export {
  initDatabase,
  getDatabase,
  closeDatabase,
  isDatabaseInitialized,
  getPowerSyncDatabase,
  getConnector,
  connectSync,
  disconnectSync,
  isSyncEnabled,
  getSyncStatus,
  onSyncStatusChange,
  type StrideDatabase,
  type DatabaseConfig,
  type LocalDatabaseConfig,
  type SyncDatabaseConfig,
  type SyncStatus,
  type SyncState,
} from './client';

export { SupabaseConnector } from './connector';

export { generateId, now, today } from './utils';
