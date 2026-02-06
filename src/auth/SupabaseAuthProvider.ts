/**
 * Supabase implementation of AuthProvider interface
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthProvider,
  AuthSession,
  AuthEventType,
  SignInCredentials,
  OAuthProvider,
} from '@stridetime/types';

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

  async signUp(
    credentials: SignInCredentials,
    metadata?: { firstName?: string; lastName?: string }
  ): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          first_name: metadata?.firstName,
          last_name: metadata?.lastName,
        },
      },
    });

    if (error) throw error;
    if (!data.session) throw new Error('No session returned from sign up');

    return this.mapSession(data.session);
  }

  async signInWithOAuth(provider: OAuthProvider): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:1420',
      },
    });

    if (error) throw error;
    // OAuth redirects to provider, session will be established on callback
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session ? this.mapSession(session) : null;
  }

  async refreshSession(): Promise<AuthSession | null> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.refreshSession();
    if (error) throw error;
    return session ? this.mapSession(session) : null;
  }

  onAuthChange(
    callback: (session: AuthSession | null, event: AuthEventType) => void,
  ): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((event, session) =>
      callback(
        session ? this.mapSession(session) : null,
        event as AuthEventType,
      )
    );

    return () => subscription.unsubscribe();
  }

  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<{ error?: Error }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: options?.redirectTo,
    });
    return { error: error || undefined };
  }

  async updateUser(attributes: { password?: string }): Promise<{ error?: Error }> {
    console.log('SupabaseAuthProvider.updateUser called with:', attributes);
    const { error } = await this.supabase.auth.updateUser(attributes);
    console.log('Supabase auth.updateUser result:', { error });
    return { error: error || undefined };
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
