import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'viewer';

export function getUserRole(user: User): UserRole {
  return user.user_metadata?.user_role === 'admin' ? 'admin' : 'viewer';
}

export function isAdmin(user: User): boolean {
  return getUserRole(user) === 'admin';
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}
