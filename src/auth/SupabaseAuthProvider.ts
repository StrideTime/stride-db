/**
 * Supabase implementation of AuthProvider interface
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthProvider, AuthSession, SignInCredentials } from '@stridetime/types';

export class SupabaseAuthProvider implements AuthProvider {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!data.session) throw new Error('No session returned');

    return this.mapSession(data.session);
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session ? this.mapSession(session) : null;
  }

  async refreshSession(): Promise<AuthSession | null> {
    const { data: { session }, error } = await this.supabase.auth.refreshSession();
    if (error) throw error;
    return session ? this.mapSession(session) : null;
  }

  onAuthChange(callback: (session: AuthSession | null) => void): () => void {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      (_, session) => callback(session ? this.mapSession(session) : null)
    );
    
    return () => subscription.unsubscribe();
  }

  private mapSession(session: any): AuthSession {
    return {
      user: {
        id: session.user.id,
        email: session.user.email!,
        firstName: session.user.user_metadata?.first_name,
        lastName: session.user.user_metadata?.last_name,
        avatarUrl: session.user.user_metadata?.avatar_url,
        timezone: '', // Will be populated from user preferences
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };
  }

  // Expose Supabase client for PowerSync connector
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}
