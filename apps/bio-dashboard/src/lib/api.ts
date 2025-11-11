/**
 * API Client for Bio Internal Dashboard
 * Connects to bio-internal Elysia API
 */

// In production (Railway), API is served from same domain
// In development, use localhost:4100
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:4100');

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
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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
