/**
 * API Client for Bio Internal Dashboard
 * Connects to bio-internal Elysia API
 */

import { supabase } from './auth';

// API URL configuration
// IMPORTANT: In Coolify, you MUST set VITE_API_URL to your backend service URL
// Example: https://your-backend-domain.sslip.io or https://your-backend.ngrok-free.app
// In development: use localhost:4100 for API calls
const configuredBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const fallbackBaseUrl = import.meta.env.DEV ? 'http://localhost:4100' : '';

export const API_BASE_URL = configuredBaseUrl || fallbackBaseUrl;

console.log('[API] Using API base URL:', API_BASE_URL);

export interface GrowthSource {
  id: string;
  platform: string;
  slug: string;
  displayName: string;
  config: Record<string, any>;
  collectionIntervalMinutes: number;
  lastCollectedAt: string | null;
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthMetric {
  id: string;
  sourceId: string;
  platform: string;
  metricType: string;
  value: string;
  recordedAt: string;
  metadata: Record<string, any>;
}

export interface GrowthSnapshot {
  snapshotAt: string;
  value: number;
  changeAbs: number | null;
  changePct: number | null;
}

export interface GrowthSourceSummary {
  slug: string;
  displayName: string;
  platform: string;
  status: string | null;
  lastCollectedAt?: string | null;
  metrics: {
    metricType: string;
    value: number;
    changeAbs?: number | null;
    changePct?: number | null;
    snapshotAt: string;
  }[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Get the current session token from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add Authorization header if we have a token
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Growth Analytics Endpoints
  async getGrowthSources(window: string = 'day'): Promise<{ data: GrowthSourceSummary[] }> {
    return this.request(`/api/growth/sources?window=${window}`);
  }

  async getGrowthHistory(
    slug: string,
    metric: string,
    window: string = 'day',
    range?: number,
  ): Promise<{ data: GrowthSnapshot[] }> {
    let url = `/api/growth/history/${slug}?metric=${metric}&window=${window}`;
    if (range) {
      url += `&range=${range}`;
    }
    return this.request(url);
  }

  // Health Check
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }
}

export const api = new ApiClient(API_BASE_URL);

/**
 * Helper function for authenticated fetch requests
 * Automatically includes the JWT token from Supabase
 */
export async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
  // Get the current session token from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Add Authorization header if we have a token
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
