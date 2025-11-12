/**
 * Supabase Storage Adapter
 * Stores printer state in Supabase PostgreSQL database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageAdapter, PrinterState } from './storage-adapter.js';

export class SupabaseStorage implements IStorageAdapter {
  private client: SupabaseClient | null = null;
  private readonly stateId = 'default';

  private getClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'Supabase credentials not found. Set SUPABASE_URL and SUPABASE_KEY environment variables.'
        );
      }

      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    }

    return this.client;
  }

  async loadState(): Promise<PrinterState | null> {
    try {
      const client = this.getClient();

      const { data, error } = await client
        .from('printer_state')
        .select('state')
        .eq('id', this.stateId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - state doesn't exist yet
          console.log('No printer state found in Supabase, will initialize fresh state');
          return null;
        }
        throw error;
      }

      console.log('Successfully loaded printer state from Supabase');
      return data?.state || null;
    } catch (error) {
      console.error('Error loading state from Supabase:', error);
      throw error;
    }
  }

  async saveState(state: PrinterState): Promise<void> {
    try {
      const client = this.getClient();

      const { error } = await client
        .from('printer_state')
        .upsert({
          id: this.stateId,
          state: state,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      console.log('Successfully saved printer state to Supabase');
    } catch (error) {
      console.error('Error saving state to Supabase:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();

      const { error } = await client
        .from('printer_state')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }

  async clearState(): Promise<void> {
    try {
      const client = this.getClient();

      const { error } = await client
        .from('printer_state')
        .delete()
        .eq('id', this.stateId);

      if (error) {
        throw error;
      }

      console.log('Successfully cleared printer state from Supabase');
    } catch (error) {
      console.error('Error clearing state from Supabase:', error);
      throw error;
    }
  }

  getType(): string {
    return 'supabase';
  }
}
