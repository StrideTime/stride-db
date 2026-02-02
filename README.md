# @stridetime/db

Database layer for Stride - Drizzle ORM with local-first SQLite.

## Features

- **Local-first SQLite** - Works offline, data stored on device
- **Type-safe** - Full TypeScript support with types generated from schema
- **Drizzle ORM** - Type-safe query builder with no raw SQL needed
- **Auto-generated Types** - Single source of truth for schema and types
- **Migration Support** - Generate and run migrations with drizzle-kit
- **Framework Agnostic** - Works with Tauri, React, and web apps

## Installation

```bash
# Using yarn
yarn add @stridetime/db

# Using npm
npm install @stridetime/db
```

### GitHub Package Registry Setup

This package is published to GitHub Package Registry. You need to configure authentication:

1. Create a GitHub Personal Access Token with `read:packages` scope
2. Create `.npmrc` file in your project root:

```
@stridetime:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
```

## Usage

### Basic Setup

```typescript
import { initDatabase, getDatabase, generateId, now } from '@stridetime/db';

// Initialize database
initDatabase({
  dbPath: './stride.db', // or ':memory:' for in-memory
});

// Get database instance
const db = getDatabase();
```

### Querying Data

```typescript
import {
  getDatabase,
  users,
  tasks,
  projects,
  eq,
  and,
  desc,
} from '@stridetime/db';

const db = getDatabase();

// Find many with filters using relational queries
const userTasks = await db.query.tasks.findMany({
  where: and(
    eq(tasks.userId, 'user_123'),
    eq(tasks.deleted, false)
  ),
  orderBy: desc(tasks.createdAt),
  with: {
    project: true,
    timeEntries: true,
  },
});

// Find single record
const task = await db.query.tasks.findFirst({
  where: eq(tasks.id, 'task_456'),
  with: {
    subTasks: true,
  },
});

// Select with specific columns
const taskTitles = await db
  .select({ id: tasks.id, title: tasks.title })
  .from(tasks)
  .where(eq(tasks.userId, 'user_123'));
```

### Inserting Data

```typescript
import { getDatabase, tasks, generateId, now, TaskDifficulty, TaskStatus } from '@stridetime/db';

const db = getDatabase();

// Insert a single record
await db.insert(tasks).values({
  id: generateId(),
  userId: 'user_123',
  projectId: 'project_456',
  title: 'My new task',
  difficulty: TaskDifficulty.MEDIUM,
  status: TaskStatus.BACKLOG,
  progress: 0,
  actualMinutes: 0,
  deleted: false,
  createdAt: now(),
  updatedAt: now(),
});

// Insert multiple records
await db.insert(tasks).values([
  { id: generateId(), userId: 'user_123', ... },
  { id: generateId(), userId: 'user_123', ... },
]);
```

### Updating Data

```typescript
import { getDatabase, tasks, eq, now } from '@stridetime/db';

const db = getDatabase();

// Update single record
await db
  .update(tasks)
  .set({
    progress: 50,
    status: 'IN_PROGRESS',
    updatedAt: now(),
  })
  .where(eq(tasks.id, 'task_456'));

// Soft delete
await db
  .update(tasks)
  .set({ deleted: true, updatedAt: now() })
  .where(eq(tasks.id, 'task_456'));
```

### Deleting Data

```typescript
import { getDatabase, tasks, eq } from '@stridetime/db';

const db = getDatabase();

// Hard delete (use sparingly - prefer soft deletes)
await db.delete(tasks).where(eq(tasks.id, 'task_456'));
```

### Counting and Aggregations

```typescript
import { getDatabase, tasks, eq, count, sum, and } from '@stridetime/db';

const db = getDatabase();

// Count records
const [{ count: taskCount }] = await db
  .select({ count: count() })
  .from(tasks)
  .where(and(
    eq(tasks.userId, 'user_123'),
    eq(tasks.deleted, false)
  ));

// Sum values
const [{ total }] = await db
  .select({ total: sum(tasks.actualMinutes) })
  .from(tasks)
  .where(eq(tasks.userId, 'user_123'));
```

## Available Tables

```typescript
import {
  users,              // User accounts
  roles,              // Subscription roles with feature flags
  userSubscriptions,  // User subscription details
  subscriptionHistory,// Subscription change history
  workspaces,         // Workspaces (Personal, Work, Team)
  workspaceMembers,   // Team collaboration
  projects,           // Projects within workspaces
  taskTypes,          // User-defined task categories
  tasks,              // Tasks with sub-task support
  timeEntries,        // Time tracking entries
  scheduledEvents,    // Calendar time blocks
  pointsLedger,       // Points history
  dailySummaries,     // Pre-computed daily stats
  userPreferences,    // User settings
} from '@stridetime/db';
```

## Enums

All enums are exported as const objects with TypeScript types:

```typescript
import {
  SubscriptionStatus,  // ACTIVE, CANCELED, PAST_DUE, TRIAL
  BillingPeriod,       // MONTHLY, YEARLY, LIFETIME
  WorkspaceType,       // PERSONAL, WORK, TEAM
  WorkspaceMemberRole, // OWNER, ADMIN, MEMBER, VIEWER
  TaskDifficulty,      // TRIVIAL, EASY, MEDIUM, HARD, EXTREME
  TaskStatus,          // BACKLOG, PLANNED, IN_PROGRESS, COMPLETED, ARCHIVED
  ScheduledEventType,  // TASK, MEETING, BREAK, OTHER
  Theme,               // LIGHT, DARK, SYSTEM
  PlanningMode,        // WEEKLY, DAILY, TIME_BLOCKER, MINIMAL
  PointsReason,        // WORK_SESSION, TASK_COMPLETED, EFFICIENCY_BONUS, ...
} from '@stridetime/db';

// Usage
const task = {
  difficulty: TaskDifficulty.MEDIUM,
  status: TaskStatus.IN_PROGRESS,
};
```

## TypeScript Types

Types are automatically generated from the schema:

```typescript
import type {
  // Select types (for reading)
  User,
  Task,
  Project,
  TimeEntry,
  ScheduledEvent,
  // ...etc

  // Insert types (for creating)
  NewUser,
  NewTask,
  NewProject,
  NewTimeEntry,
  NewScheduledEvent,
  // ...etc
} from '@stridetime/db';
```

## Query Operators

All Drizzle operators are re-exported for convenience:

```typescript
import {
  // Comparison
  eq, ne, gt, gte, lt, lte,
  // Logical
  and, or, not,
  // Arrays
  inArray, notInArray,
  // Null checks
  isNull, isNotNull,
  // Other
  between, like, ilike,
  // Raw SQL (escape hatch)
  sql,
  // Ordering
  asc, desc,
  // Aggregations
  count, sum, avg, min, max,
} from '@stridetime/db';
```

## Utilities

```typescript
import { generateId, now, today } from '@stridetime/db';

// Generate UUID v4
const id = generateId(); // "550e8400-e29b-41d4-a716-446655440000"

// Get current ISO timestamp
const timestamp = now(); // "2026-01-28T14:30:00.000Z"

// Get today's date
const date = today(); // "2026-01-28"
```

## Migrations

This package uses drizzle-kit for migrations:

```bash
# Generate migrations from schema changes
yarn db:generate

# Run migrations
yarn db:migrate

# Open Drizzle Studio (visual database browser)
yarn db:studio
```

## Development

```bash
# Install dependencies
yarn install

# Build package
yarn build

# Watch mode (for development)
yarn dev

# Lint code
yarn lint

# Type check
yarn typecheck

# Run tests
yarn test
```

## Publishing

This package uses [Changesets](https://github.com/changesets/changesets) for version management.

```bash
# 1. Create a changeset
yarn changeset

# 2. Version packages (updates CHANGELOG and package.json)
yarn version

# 3. Build and publish
yarn release
```

## License

AGPL-3.0

## Repository

https://github.com/stridetime/stride-db
