import { useEffect, useState, useRef } from 'preact/hooks';
import { api, GrowthSnapshot } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlatformIcon } from '../components/PlatformIcon';
import { formatNumber, formatDate } from '../lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartConfiguration,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PlatformProps {
  platform: string;
}

export function Platform({ platform }: PlatformProps) {
  const [history, setHistory] = useState<GrowthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [timeRange, setTimeRange] = useState<number>(365);
  const [currentPlatform, setCurrentPlatform] = useState<string>(platform);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  // Platform-specific metric types
  const platformMetrics: Record<string, string[]> = {
    discord: ['discord_member_count', 'discord_message_count'],
    telegram: ['telegram_member_count', 'telegram_message_count'],
    twitter: ['twitter_follower_count', 'twitter_impression_count'],
    youtube: ['youtube_subscriber_count', 'youtube_view_count'],
    email_newsletter: ['email_newsletter_signup_count'],
    luma: ['luma_subscriber_count', 'luma_page_views'],
    linkedin: ['linkedin_follower_count'],
    website_bio: ['website_page_views', 'website_active_users', 'website_new_users'],
    website_app: ['website_page_views', 'website_active_users', 'website_new_users'],
  };

  const metrics = platformMetrics[platform] || [];

  useEffect(() => {
    // Check if platform actually changed
    if (platform !== currentPlatform) {
      console.log(`[Platform] Switching from ${currentPlatform} to ${platform}`);
      // Clear previous data when switching to a different platform
      setHistory([]);
      setCurrentPlatform(platform);

      // Always reset to first metric when platform changes
      const firstMetric = platformMetrics[platform]?.[0];
      if (firstMetric) {
        console.log(`[Platform] Setting metric to: ${firstMetric}`);
        setSelectedMetric(firstMetric);
      }
    } else if (!selectedMetric && platformMetrics[platform]?.length > 0) {
      // Initial load - select first metric if none selected
      const firstMetric = platformMetrics[platform][0];
      console.log(`[Platform] Initial load, setting metric to: ${firstMetric}`);
      setSelectedMetric(firstMetric);
    }
  }, [platform, currentPlatform, selectedMetric]);

  useEffect(() => {
    if (selectedMetric) {
      loadData();
    }
  }, [selectedMetric, timeRange]);

  // Update chart when history changes
  useEffect(() => {
    if (!chartRef.current || history.length === 0) return;

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const chartLabels = history.map((snapshot) =>
      new Date(snapshot.snapshotAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    );

    const chartValues = history.map((snapshot) => snapshot.value);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: selectedMetric.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
            data: chartValues,
            fill: true,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: '#000',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#9ca3af',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context: any) {
                return formatNumber(context.parsed.y);
              }
            }
          },
        },
        scales: {
          x: {
            grid: {
              color: '#1f2937',
              drawBorder: false,
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 11,
              },
            },
          },
          y: {
            grid: {
              color: '#1f2937',
              drawBorder: false,
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 11,
              },
              callback: function(value: any) {
                return formatNumber(value);
              }
            },
          },
        },
      },
    };

    chartInstanceRef.current = new ChartJS(ctx, config);

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [history, selectedMetric]);

  const loadData = async () => {
    if (!selectedMetric) return;

    try {
      setLoading(true);
      console.log('[Platform] Loading history for:', platform, selectedMetric, 'timeRange:', timeRange);
      const response = await api.getGrowthHistory(platform, selectedMetric, 'month', timeRange);
      console.log('[Platform] History response:', response);
      setHistory(response.data);
    } catch (err) {
      console.error('[Platform] Error loading history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const platformNames: Record<string, string> = {
    discord: 'Discord',
    telegram: 'Telegram',
    twitter: 'Twitter',
    youtube: 'YouTube',
    email_newsletter: 'Email Newsletter',
    luma: 'Luma',
    linkedin: 'LinkedIn',
    website_bio: 'Website (bio.xyz)',
    website_app: 'Website (app.bio.xyz)',
  };

  return (
    <div class="space-y-8">
      <div class="flex items-center gap-4">
        <div class="text-blue-500">
          <PlatformIcon platform={platform} size="xl" />
        </div>
        <div>
          <h2 class="text-3xl font-bold text-white mb-2">
            {platformNames[platform] || platform}
          </h2>
          <p class="text-gray-400">Detailed analytics and historical data</p>
        </div>
      </div>

      {/* Controls */}
      <div class="flex flex-wrap gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">Metric</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric((e.target as HTMLSelectElement).value)}
            class="bg-black border border-gray-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {metrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt((e.target as HTMLSelectElement).value))}
            class="bg-black border border-gray-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value={90}>Last 3 months</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div class="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
          Error: {error}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {history.length > 0 && (
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-800 shadow-lg">
                <p class="text-sm font-medium text-gray-400 mb-2">Current Value</p>
                <p class="text-4xl font-bold text-white mb-1">
                  {formatNumber(history[history.length - 1]?.value || 0)}
                </p>
                <p class="text-xs text-gray-500">
                  as of {formatDate(history[history.length - 1]?.snapshotAt)}
                </p>
              </div>

              <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-800 shadow-lg">
                <p class="text-sm font-medium text-gray-400 mb-2">Monthly Change</p>
                <p
                  class={`text-4xl font-bold mb-1 ${(history[history.length - 1]?.changeAbs || 0) > 0 ? 'text-green-400' : (history[history.length - 1]?.changeAbs || 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}
                >
                  {history[history.length - 1]?.changeAbs
                    ? `${(history[history.length - 1].changeAbs || 0) > 0 ? '+' : ''}${formatNumber(history[history.length - 1].changeAbs || 0)}`
                    : 'N/A'}
                </p>
                <p class="text-xs text-gray-500">absolute change</p>
              </div>

              <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-800 shadow-lg">
                <p class="text-sm font-medium text-gray-400 mb-2">Growth Rate</p>
                <p
                  class={`text-4xl font-bold mb-1 ${(history[history.length - 1]?.changePct || 0) > 0 ? 'text-green-400' : (history[history.length - 1]?.changePct || 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}
                >
                  {history[history.length - 1]?.changePct
                    ? `${(history[history.length - 1].changePct || 0) > 0 ? '+' : ''}${(history[history.length - 1].changePct || 0).toFixed(1)}%`
                    : 'N/A'}
                </p>
                <p class="text-xs text-gray-500">month over month</p>
              </div>
            </div>
          )}

          {/* Professional Chart */}
          {history.length > 0 && (
            <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-lg overflow-hidden">
              <div class="px-6 py-5 border-b border-gray-800">
                <h3 class="text-lg font-semibold text-white">Growth Trend</h3>
                <p class="text-sm text-gray-400 mt-1">Monthly performance over time</p>
              </div>
              <div class="p-6">
                <div style={{ height: '400px' }}>
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>
            </div>
          )}

          {/* Historical Data Table */}
          <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-lg overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-800">
              <h3 class="text-lg font-semibold text-white">Historical Data</h3>
              <p class="text-sm text-gray-400 mt-1">Detailed monthly breakdown</p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-black/50">
                  <tr>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Change
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Growth %
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                  {[...history].reverse().map((snapshot, idx) => (
                    <tr key={idx} class="hover:bg-gray-900/50 transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(snapshot.snapshotAt)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {formatNumber(snapshot.value)}
                      </td>
                      <td
                        class={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${(snapshot.changeAbs || 0) > 0 ? 'text-green-400' : (snapshot.changeAbs || 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}
                      >
                        {snapshot.changeAbs
                          ? `${(snapshot.changeAbs || 0) > 0 ? '+' : ''}${formatNumber(snapshot.changeAbs || 0)}`
                          : '—'}
                      </td>
                      <td
                        class={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${(snapshot.changePct || 0) > 0 ? 'text-green-400' : (snapshot.changePct || 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}
                      >
                        {snapshot.changePct
                          ? `${(snapshot.changePct || 0) > 0 ? '+' : ''}${(snapshot.changePct || 0).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
