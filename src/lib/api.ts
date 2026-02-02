// API Client for Backend Communication
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        };

        const response = await fetch(url, config);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP Error: ${response.status}`);
        }

        return response.json();
    }

    // Generic CRUD operations
    async getAll<T>(table: string): Promise<T[]> {
        return this.request<T[]>(`/api/${table}`);
    }

    async getById<T>(table: string, id: string): Promise<T> {
        return this.request<T>(`/api/${table}/${id}`);
    }

    async create<T>(table: string, data: Partial<T>): Promise<T> {
        return this.request<T>(`/api/${table}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
        return this.request<T>(`/api/${table}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete(table: string, id: string): Promise<void> {
        return this.request<void>(`/api/${table}/${id}`, {
            method: 'DELETE',
        });
    }

    // Specific query methods (matching Supabase pattern)
    from(table: string) {
        return {
            select: async () => {
                const data = await this.getAll<any>(table);
                return { data, error: null };
            },
            insert: async (values: any) => {
                try {
                    const data = await this.create(table, values);
                    return { data, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            },
            update: (values: any) => {
                // Return an object with eq method, NOT a promise
                return {
                    eq: async (_field: string, value: any) => {
                        try {
                            const data = await this.update(table, value, values);
                            return { data, error: null };
                        } catch (error: any) {
                            return { data: null, error };
                        }
                    }
                };
            },
            delete: () => {
                // Return an object with eq method, NOT a promise
                return {
                    eq: async (_field: string, value: any) => {
                        try {
                            await this.delete(table, value);
                            return { data: null, error: null };
                        } catch (error: any) {
                            return { data: null, error };
                        }
                    }
                };
            }
        };
    }
}

export const api = new ApiClient(API_URL);

// Re-export types from supabase for compatibility
export type { Location, Asset, AssetType, AssetWithDetails, CameraDisk } from './supabase';
