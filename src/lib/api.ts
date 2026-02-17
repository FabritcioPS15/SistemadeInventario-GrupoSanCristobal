// API Client wrapper for Supabase - Ensuring all calls go through the official Supabase client
import { supabase } from './supabase';

class ApiClient {
    // Delegates to official Supabase client with proper typing
    from(table: string) {
        return supabase.from(table as any);
    }

    // Mantener compatibilidad con llamadas directas si existieran
    async getAll<T>(table: string): Promise<T[]> {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        return data as T[];
    }

    async getById<T>(table: string, id: string): Promise<T> {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error) throw error;
        return data as T;
    }

    async create<T>(table: string, data: Partial<T>): Promise<T> {
        const { data: created, error } = await supabase.from(table).insert(data).select().single();
        if (error) throw error;
        return created as T;
    }

    async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
        const { data: updated, error } = await supabase.from(table).update(data).eq('id', id).select().single();
        if (error) throw error;
        return updated as T;
    }

    async delete(table: string, id: string): Promise<void> {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
    }
}

export const api = new ApiClient();

// Re-export types from supabase for compatibility
export type { Location, Asset, AssetType, AssetWithDetails, CameraDisk } from './supabase';
