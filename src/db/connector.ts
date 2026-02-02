/**
 * Supabase Backend Connector for PowerSync
 *
 * Handles authentication and data upload between PowerSync and Supabase.
 * This connector is only used when cloud sync is enabled.
 */

import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface SupabaseConnectorConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** PowerSync service endpoint URL */
  powersyncUrl: string;
}

// ============================================================================
// CONNECTOR
// ============================================================================

export class SupabaseConnector implements PowerSyncBackendConnector {
  private supabase: SupabaseClient;
  private powersyncUrl: string;

  constructor(config: SupabaseConnectorConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    this.powersyncUrl = config.powersyncUrl;
  }

  /**
   * Get the Supabase client instance.
   * Useful for auth operations (sign in, sign out, etc.)
   */
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Fetch credentials for PowerSync authentication.
   * Returns null if the user is not signed in.
   */
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session) {
      return null;
    }

    return {
      endpoint: this.powersyncUrl,
      token: session.access_token,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : undefined,
    };
  }

  /**
   * Upload local changes to Supabase.
   * Called automatically by PowerSync when there are pending writes.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      return;
    }

    try {
      for (const op of transaction.crud) {
        const table = op.table;
        const record = op.opData;

        switch (op.op) {
          case 'PUT': {
            const { error } = await this.supabase
              .from(table)
              .upsert(
                { ...record, id: op.id },
                { onConflict: 'id' }
              );
            if (error) throw error;
            break;
          }
          case 'PATCH': {
            const { error } = await this.supabase
              .from(table)
              .update(record)
              .eq('id', op.id);
            if (error) throw error;
            break;
          }
          case 'DELETE': {
            const { error } = await this.supabase
              .from(table)
              .delete()
              .eq('id', op.id);
            if (error) throw error;
            break;
          }
        }
      }

      await transaction.complete();
    } catch (error) {
      // Transaction will be retried on next sync cycle
      console.error('Upload failed, will retry:', error);
      throw error;
    }
  }
}
