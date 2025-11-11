import { useEffect, useState } from 'preact/hooks';
import { api, GrowthSourceSummary, GrowthSnapshot } from '../lib/api';
import { MetricCard } from '../components/MetricCard';
import { ChartCard } from '../components/ChartCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlatformIcon } from '../components/PlatformIcon';
import { formatNumber, formatPercentage } from '../lib/utils';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface DAOWeeklyStats {
  totalDaos: number;
  totalFollowers: number;
  totalPosts: number;
  weeklyGrowth: number;
  weeklyGrowthPct: number;
  topPerformer: {
    name: string;
    slug: string;
    growth: number;
    growthPct: number;
  } | null;
  largestDao: {
    name: string;
    slug: string;
    followerCount: number;
  } | null;
  mostActive: {
    name: string;
    slug: string;
    tweetCount: number;
  } | null;
  engagementLeader: {
    name: string;
    slug: string;
    engagementRate: number;
    avgEngagement: number;
  } | null;
  sparklineData: Array<{ date: string; totalFollowers: number }>;
}

export function Overview() {
  const [sources, setSources] = useState<GrowthSourceSummary[]>([]);
  const [daoStats, setDaoStats] = useState<DAOWeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState<'day' | 'week' | 'month'>('month');
  const [trendData, setTrendData] = useState<Map<string, GrowthSnapshot[]>>(new Map());
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [chartConfig, setChartConfig] = useState<ChartConfiguration | null>(null);
  const [chartView, setChartView] = useState<'absolute' | 'normalized' | 'growth'>('absolute');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['Twitter Followers', 'Discord Members', 'Telegram Members', 'YouTube Subscribers', 'LinkedIn Followers']));

  useEffect(() => {
    loadData();
  }, [window]);

  useEffect(() => {
    if (sources.length > 0) {
      loadTrendData();
    }
  }, [sources]);

  // Load trend data for comparison chart
  const loadTrendData = async () => {
    try {
      setLoadingTrends(true);

      // Define top platforms and their primary metrics to track
      const topPlatforms = [
        { slug: 'twitter', metric: 'twitter_follower_count', label: 'Twitter Followers' },
        { slug: 'discord', metric: 'discord_member_count', label: 'Discord Members' },
        { slug: 'telegram', metric: 'telegram_member_count', label: 'Telegram Members' },
        { slug: 'youtube', metric: 'youtube_subscriber_count', label: 'YouTube Subscribers' },
        { slug: 'linkedin', metric: 'linkedin_follower_count', label: 'LinkedIn Followers' },
      ];

      const trends = new Map<string, GrowthSnapshot[]>();

      // Fetch history for each platform (365 days = 1 year)
      await Promise.all(
        topPlatforms.map(async (platform) => {
          try {
            const response = await api.getGrowthHistory(platform.slug, platform.metric, 'month', 365);
            if (response.data.length > 0) {
              trends.set(platform.label, response.data);
            }
          } catch (err) {
            console.error(`Error loading trend for ${platform.slug}:`, err);
          }
        })
      );

      setTrendData(trends);
    } catch (err) {
      console.error('Error loading trend data:', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[Overview] Loading data for window:', window);

      // Load both growth sources and DAO stats
      const [growthResponse, daoResponse] = await Promise.all([
        api.getGrowthSources(window),
        fetch('http://localhost:4100/daos/stats/weekly').then(r => r.json()),
      ]);

      console.log('[Overview] API Response:', growthResponse);
      console.log('[Overview] Sources count:', growthResponse.data.length);
      setSources(growthResponse.data);

      if (daoResponse.success) {
        setDaoStats(daoResponse.data);
      }
    } catch (err) {
      console.error('[Overview] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Update comparison chart configuration when trend data changes
  useEffect(() => {
    if (trendData.size === 0 || loadingTrends) return;

    // Get all unique dates across all platforms
    const allDates = new Set<string>();
    trendData.forEach((snapshots) => {
      snapshots.forEach((snapshot) => {
        allDates.add(snapshot.snapshotAt);
      });
    });

    const sortedDates = Array.from(allDates).sort();
    const labels = sortedDates.map((date) =>
      new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    );

    // Color palette for different platforms
    const colors = [
      { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' },   // Blue
      { border: 'rgb(139, 92, 246)', bg: 'rgba(139, 92, 246, 0.1)' },   // Purple
      { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' },   // Pink
      { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' },     // Green
      { border: 'rgb(251, 146, 60)', bg: 'rgba(251, 146, 60, 0.1)' },   // Orange
    ];

    // Filter by selected platforms
    const filteredData = Array.from(trendData.entries()).filter(([label]) => selectedPlatforms.has(label));

    // Create datasets based on chart view
    const datasets = filteredData.map(([label, snapshots], index) => {
      const color = colors[index % colors.length];

      // Create data array with values for each date
      let data = sortedDates.map((date) => {
        const snapshot = snapshots.find((s) => s.snapshotAt === date);
        return snapshot ? snapshot.value : null;
      });

      // Transform data based on view type
      if (chartView === 'normalized') {
        // Normalize to percentage of starting value
        const firstValue = data.find((v) => v !== null);
        if (firstValue && firstValue !== 0) {
          data = data.map((v) => (v !== null ? ((v - firstValue) / firstValue) * 100 : null));
        }
      } else if (chartView === 'growth') {
        // Show month-over-month growth rate
        const growthData: (number | null)[] = [null]; // First month has no growth
        for (let i = 1; i < data.length; i++) {
          if (data[i] !== null && data[i - 1] !== null && data[i - 1] !== 0) {
            growthData.push(((data[i]! - data[i - 1]!) / data[i - 1]!) * 100);
          } else {
            growthData.push(null);
          }
        }
        data = growthData;
      }

      return {
        label,
        data,
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color.border,
        pointBorderColor: '#000',
        pointBorderWidth: 2,
        fill: false,
      };
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#9ca3af',
              font: {
                size: 13,
                weight: 600,
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.98)',
            titleColor: '#fff',
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyColor: '#e5e7eb',
            bodyFont: {
              size: 13,
            },
            borderColor: '#374151',
            borderWidth: 1,
            padding: 16,
            displayColors: true,
            usePointStyle: true,
            callbacks: {
              label: function (context: any) {
                const label = context.dataset.label || '';
                const value = formatNumber(context.parsed.y);

                // Get previous value for trend indicator
                const dataIndex = context.dataIndex;
                if (dataIndex > 0) {
                  const prevValue = context.dataset.data[dataIndex - 1];
                  if (prevValue !== null && prevValue !== undefined) {
                    const change = context.parsed.y - prevValue;
                    const changePct = (change / prevValue) * 100;
                    const trend = change > 0 ? '↑' : change < 0 ? '↓' : '•';
                    const trendColor = change > 0 ? '🟢' : change < 0 ? '🔴' : '⚪';
                    return `${label}: ${value} ${trendColor} ${trend} ${Math.abs(changePct).toFixed(1)}%`;
                  }
                }
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: '#1f2937',
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12,
              },
              maxRotation: 45,
              minRotation: 0,
            },
          },
          y: {
            grid: {
              color: '#1f2937',
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12,
              },
              callback: function (value: any) {
                if (chartView === 'normalized' || chartView === 'growth') {
                  return value.toFixed(1) + '%';
                }
                return formatNumber(value);
              },
            },
            title: {
              display: chartView !== 'absolute',
              text: chartView === 'normalized' ? 'Growth from Start (%)' : 'Monthly Growth Rate (%)',
              color: '#9ca3af',
              font: {
                size: 13,
                weight: 'bold',
              },
            },
          },
        },
      },
    };

    setChartConfig(config);
  }, [trendData, loadingTrends, chartView, selectedPlatforms]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div class="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
        Error: {error}
      </div>
    );
  }

  // Extract key metrics for each platform
  const platformMetrics = sources.map((source) => {
    const mainMetric = source.metrics.find(
      (m) =>
        m.metricType.includes('member_count') ||
        m.metricType.includes('follower_count') ||
        m.metricType.includes('subscriber_count') ||
        m.metricType.includes('page_views'),
    );

    return {
      platform: source.displayName,
      slug: source.slug,
      platformSlug: source.slug,
      value: mainMetric ? formatNumber(mainMetric.value) : 'N/A',
      change: mainMetric?.changePct
        ? formatPercentage(mainMetric.changePct)
        : undefined,
      changeType: mainMetric?.changePct
        ? mainMetric.changePct > 0
          ? 'positive'
          : mainMetric.changePct < 0
            ? 'negative'
            : 'neutral'
        : 'neutral',
      lastUpdate: source.lastCollectedAt,
    };
  });

  console.log('[Overview] Rendering with sources:', sources.length, 'platformMetrics:', platformMetrics.length);

  return (
    <div class="space-y-8">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-4xl font-bold text-white mb-2">Growth Overview</h2>
          <p class="text-gray-400 text-lg">Marketing metrics across all platforms</p>
        </div>

        {/* Window Selector */}
        <div class="flex gap-2 bg-black border border-gray-800 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              class={`px-6 py-2.5 rounded-md text-sm font-semibold transition-all ${
                window === w
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              {w.charAt(0).toUpperCase() + w.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* DAO Ecosystem Snapshot */}
      {daoStats && (
        <>
          <div class="border-t border-gray-800 pt-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wide">DAO Ecosystem</h3>
              <span class="text-xs text-gray-500">Last 7 Days</span>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total DAOs */}
            <div class="bg-gradient-to-br from-gray-900/50 to-black/30 rounded-lg p-5 border border-gray-800/50 hover:border-blue-500/30 transition-all shadow-sm hover:shadow-blue-500/10 backdrop-blur-sm">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Total DAOs</p>
              <p class="text-3xl font-bold text-white mb-1">{daoStats.totalDaos}</p>
            </div>

            {/* Total Reach */}
            <div class="bg-gradient-to-br from-gray-900/50 to-black/30 rounded-lg p-5 border border-gray-800/50 hover:border-purple-500/30 transition-all shadow-sm hover:shadow-purple-500/10 backdrop-blur-sm">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Total Reach</p>
              <p class="text-3xl font-bold text-white">{formatNumber(daoStats.totalFollowers)}</p>
            </div>

            {/* Total Content */}
            <div class="bg-gradient-to-br from-gray-900/50 to-black/30 rounded-lg p-5 border border-gray-800/50 hover:border-green-500/30 transition-all shadow-sm hover:shadow-green-500/10 backdrop-blur-sm">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Total Content</p>
              <p class="text-3xl font-bold text-white">{formatNumber(daoStats.totalPosts)}</p>
              <p class="text-xs text-gray-500 mt-2">posts</p>
            </div>

            {/* Largest DAO */}
            <div class="bg-gradient-to-br from-gray-900/50 to-black/30 rounded-lg p-5 border border-gray-800/50 hover:border-yellow-500/30 transition-all shadow-sm hover:shadow-yellow-500/10 backdrop-blur-sm">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Largest DAO</p>
              {daoStats.largestDao ? (
                <>
                  <p class="text-base font-bold text-white truncate mb-2">{daoStats.largestDao.name}</p>
                  <p class="text-xs text-gray-400 font-medium">
                    {formatNumber(daoStats.largestDao.followerCount)} followers
                  </p>
                </>
              ) : (
                <p class="text-sm text-gray-600">-</p>
              )}
            </div>

            {/* Most Active */}
            <div class="bg-gradient-to-br from-gray-900/50 to-black/30 rounded-lg p-5 border border-gray-800/50 hover:border-cyan-500/30 transition-all shadow-sm hover:shadow-cyan-500/10 backdrop-blur-sm">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Most Active</p>
              {daoStats.mostActive ? (
                <>
                  <p class="text-base font-bold text-white truncate mb-2">{daoStats.mostActive.name}</p>
                  <p class="text-xs text-gray-400 font-medium">
                    {daoStats.mostActive.tweetCount} tweets
                  </p>
                </>
              ) : (
                <p class="text-sm text-gray-600">-</p>
              )}
            </div>

            {/* Engagement Leader */}
            <div class="bg-gradient-to-br from-gray-900/50 to-black/30 rounded-lg p-5 border border-gray-800/50 hover:border-pink-500/30 transition-all shadow-sm hover:shadow-pink-500/10 backdrop-blur-sm">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Best Engagement</p>
              {daoStats.engagementLeader ? (
                <>
                  <p class="text-base font-bold text-white truncate mb-2">{daoStats.engagementLeader.name}</p>
                  <p class="text-xs text-gray-400 font-medium">
                    {daoStats.engagementLeader.engagementRate.toFixed(2)}% rate
                  </p>
                </>
              ) : (
                <p class="text-sm text-gray-600">-</p>
              )}
            </div>
          </div>
        </>
      )}

      <div class="border-t border-gray-800 pt-4">
        <h3 class="text-sm font-bold text-white uppercase tracking-wide mb-4">Platform Metrics</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {platformMetrics.map((metric) => (
          <MetricCard
            key={metric.slug}
            title={metric.platform}
            value={metric.value}
            change={metric.change}
            changeType={metric.changeType as any}
            platform={metric.platformSlug}
            subtitle={
              metric.lastUpdate
                ? `Updated ${new Date(metric.lastUpdate).toLocaleDateString()}`
                : 'No data yet'
            }
          />
        ))}
      </div>

      {/* Growth Trends Comparison Chart */}
      {chartConfig && (
        <div class="mt-8">
          <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-2xl overflow-hidden hover:border-gray-700 transition-all">
            {/* Header */}
            <div class="px-8 py-6 border-b border-gray-800 bg-gradient-to-r from-gray-900/50 to-black/50">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-2xl font-bold text-white mb-2">Growth Trends Comparison</h3>
                  <p class="text-sm text-gray-400">Analyze platform performance across different metrics and timeframes</p>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-400">
                  <span class="px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center gap-2">
                    <PlatformIcon platform="overview" size="sm" />
                    <span>Last Year</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div class="px-8 py-5 bg-black/30 border-b border-gray-800">
              <div class="flex flex-col gap-4">
                {/* View Mode Selector */}
                <div class="flex items-center gap-3">
                  <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[80px]">View Mode</span>
                  <div class="flex gap-2 bg-gray-900/50 border border-gray-700 rounded-lg p-1.5">
                    <button
                      onClick={() => setChartView('absolute')}
                      class={`px-5 py-2.5 rounded-md text-xs font-bold transition-all ${
                        chartView === 'absolute'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      Absolute Values
                    </button>
                    <button
                      onClick={() => setChartView('normalized')}
                      class={`px-5 py-2.5 rounded-md text-xs font-bold transition-all ${
                        chartView === 'normalized'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-600/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      % Growth
                    </button>
                    <button
                      onClick={() => setChartView('growth')}
                      class={`px-5 py-2.5 rounded-md text-xs font-bold transition-all ${
                        chartView === 'growth'
                          ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-600/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      Growth Rate
                    </button>
                  </div>
                </div>

                {/* Platform Filter */}
                <div class="flex items-start gap-3">
                  <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[80px] pt-2">Platforms</span>
                  <div class="flex gap-2 flex-wrap flex-1">
                    {Array.from(trendData.keys()).map((platform) => {
                      const isSelected = selectedPlatforms.has(platform);
                      return (
                        <button
                          key={platform}
                          onClick={() => {
                            const newSelected = new Set(selectedPlatforms);
                            if (newSelected.has(platform)) {
                              newSelected.delete(platform);
                            } else {
                              newSelected.add(platform);
                            }
                            setSelectedPlatforms(newSelected);
                          }}
                          class={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-600/30 to-blue-500/20 text-blue-300 border-blue-500 shadow-lg shadow-blue-600/20'
                              : 'bg-gray-900/50 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white hover:border-gray-600'
                          }`}
                        >
                          <span class="flex items-center gap-2">
                            {isSelected ? '✓' : '○'} {platform.replace(' Followers', '').replace(' Members', '').replace(' Subscribers', '')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Container */}
            <div class="p-8">
              {loadingTrends ? (
                <div class="flex items-center justify-center" style={{ height: '600px' }}>
                  <div class="flex flex-col items-center gap-4">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-500"></div>
                    <p class="text-gray-400 text-sm font-medium">Loading trend data...</p>
                  </div>
                </div>
              ) : (
                <ChartCard
                  title=""
                  chartConfig={chartConfig}
                  height="600px"
                  loading={false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
