# @stridetime/db

## 0.1.12

### Patch Changes

- bumped to latest version of types package

## 0.1.10

### Patch Changes

- updated types version to support new Auth setup

## 0.1.8

### Patch Changes

- added logs to supabase provider

## 0.1.6

### Patch Changes

- added functionality for password reset

## 0.1.4

### Patch Changes

- refactored to account for testing

## 0.1.2

### Patch Changes

- added individual repo structure for all major entities

## 0.2.0

### Breaking Changes

- **Replaced ElectricSQL with PowerSync** - Sync engine changed to PowerSync for bidirectional sync support
- **New Prisma-like API** - Query builder now uses Prisma-like syntax instead of raw SQL
- **Removed auth utilities** - Auth is now handled by the PowerSync connector

### Features

- Local-first SQLite database with PowerSync integration
- Bidirectional sync with Supabase backend
- Prisma-like query API (findMany, findUnique, create, update, delete, count, upsert)
- Automatic offline queuing and conflict resolution
- Complete schema with all entities

### Migration Guide

**Before (ElectricSQL):**

```typescript
import { initDatabase, getDatabase, rawQuery } from '@stridetime/db';

await initDatabase({
  dbPath: './stride.db',
  enableSync: true,
  authToken: 'token',
  electricUrl: 'https://electric.stridetime.app',
});

const tasks = await rawQuery('SELECT * FROM tasks WHERE user_id = ?', [userId]);
```

**After (PowerSync):**

```typescript
import { initDatabase, getDatabase } from '@stridetime/db';

const db = await initDatabase({
  dbFilename: 'stride.db',
  enableSync: true,
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key',
  },
  powersyncUrl: 'https://your-project.powersync.journeyapps.com',
});

await db.connect();

const tasks = await db.tasks.findMany({
  where: { user_id: userId },
});
```

---

## 0.1.0

### Initial Release

**Features:**

- Local-first SQLite database with PowerSync integration
- Optional cloud sync for Pro/Team tiers
- Complete schema with workspaces, projects, tasks, time entries
- TypeScript type definitions for all entities
- Sync status monitoring

**Database Schema:**

- Users with profile information
- Roles with feature flags and limits
- User subscriptions with Stripe integration
- Workspaces (Personal, Work, Team)
- Workspace members for team collaboration
- Projects with completion tracking
- Tasks with sub-task support (max 2 levels deep)
- Task types (user-defined categories)
- Time entries for time tracking
- Scheduled events for time-blocking
- Points ledger for gamification
- Daily summaries for productivity insights
- User preferences for app settings

**API:**

- `initDatabase()` - Initialize database with optional sync
- `getDatabase()` - Get database instance
- `closeDatabase()` - Cleanup and disconnect
- Prisma-like table clients for all entities

**Development:**

- Vite build configuration
- TypeScript strict mode
- ESLint + Prettier
- GitHub Actions CI
- Changesets for versioning
