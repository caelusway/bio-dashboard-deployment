import { useEffect, useState, useRef } from 'preact/hooks';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatNumber } from '../lib/utils';
import { API_BASE_URL, authenticatedFetch } from '../lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DAODetails {
  id: string;
  slug: string;
  name: string;
  twitterHandle: string;
  followerCount: number;
  lastSyncedAt: string | null;
  metadata?: {
    profileImageUrl?: string;
  };
}

interface FollowerSnapshot {
  count: number;
  recordedAt: string;
}

interface TwitterAnalytics {
  summary: {
    totalTweets: number;
    totalEngagement: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    totalImpressions: number;
    avgEngagement: number;
    avgLikes: number;
    avgRetweets: number;
    avgReplies: number;
    engagementRate: number;
  };
  activityData: Array<{ date: string; count: number }>;
  topTweets: Array<{
    id: string;
    content: string;
    tweetedAt: string;
    metrics: any;
  }>;
}

export function DAODetail({ slug }: { slug: string }) {
  const [dao, setDao] = useState<DAODetails | null>(null);
  const [followers, setFollowers] = useState<FollowerSnapshot[]>([]);
  const [analytics, setAnalytics] = useState<TwitterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'30' | '90' | '365'>('90');

  const followerChartRef = useRef<HTMLCanvasElement>(null);
  const followerChartInstance = useRef<ChartJS | null>(null);
  const activityChartRef = useRef<HTMLCanvasElement>(null);
  const activityChartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    loadDAOData();
  }, [slug, timeRange]);

  const loadDAOData = async () => {
    try {
      setLoading(true);

      const [daoResponse, followersResponse, analyticsResponse] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/daos/${slug}`),
        authenticatedFetch(`${API_BASE_URL}/daos/${slug}/followers?days=${timeRange}`),
        authenticatedFetch(`${API_BASE_URL}/daos/${slug}/analytics?days=${timeRange}`),
      ]);

      const daoData = await daoResponse.json();
      const followersData = await followersResponse.json();
      const analyticsData = await analyticsResponse.json();

      if (daoData.success) {
        setDao(daoData.data);
      } else {
        setError(daoData.error || 'DAO not found');
      }

      if (followersData.success) {
        setFollowers(followersData.data);
      }

      if (analyticsData.success) {
        setAnalytics(analyticsData.data);
      }
    } catch (err) {
      console.error('Error loading DAO data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Follower Growth Chart
  useEffect(() => {
    if (!followerChartRef.current || followers.length === 0) return;

    if (followerChartInstance.current) {
      followerChartInstance.current.destroy();
    }

    const ctx = followerChartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = followers.map((f) =>
      new Date(f.recordedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );
    const data = followers.map((f) => f.count);

    followerChartInstance.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Followers',
            data,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              color: 'rgb(156, 163, 175)',
              callback: (value) => formatNumber(Number(value)),
            },
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
          },
          x: {
            ticks: {
              color: 'rgb(156, 163, 175)',
              maxRotation: 45,
              minRotation: 45,
            },
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
          },
        },
      },
    });

    return () => {
      if (followerChartInstance.current) {
        followerChartInstance.current.destroy();
      }
    };
  }, [followers]);

  // Activity Chart
  useEffect(() => {
    if (!activityChartRef.current || !analytics?.activityData.length) return;

    if (activityChartInstance.current) {
      activityChartInstance.current.destroy();
    }

    const ctx = activityChartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = analytics.activityData.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );
    const data = analytics.activityData.map((d) => d.count);

    activityChartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Tweets',
            data,
            backgroundColor: 'rgba(139, 92, 246, 0.8)',
            borderColor: 'rgb(139, 92, 246)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgb(139, 92, 246)',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgb(156, 163, 175)',
              stepSize: 1,
            },
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
          },
          x: {
            ticks: {
              color: 'rgb(156, 163, 175)',
              maxRotation: 45,
              minRotation: 45,
            },
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
          },
        },
      },
    });

    return () => {
      if (activityChartInstance.current) {
        activityChartInstance.current.destroy();
      }
    };
  }, [analytics]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !dao) {
    return (
      <div class="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
        Error: {error || 'DAO not found'}
      </div>
    );
  }

  const growthMetrics =
    followers.length >= 2
      ? {
          totalGrowth: followers[followers.length - 1].count - followers[0].count,
          growthPct:
            ((followers[followers.length - 1].count - followers[0].count) /
              followers[0].count) *
            100,
          avgDailyGrowth:
            (followers[followers.length - 1].count - followers[0].count) /
            followers.length,
        }
      : null;

  return (
    <div class="space-y-8">
      {/* Header */}
      <div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            {dao.metadata?.profileImageUrl ? (
              <img
                src={dao.metadata.profileImageUrl}
                alt={`${dao.name} profile`}
                class="w-20 h-20 rounded-full border-4 border-gray-700 shadow-lg"
              />
            ) : (
              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border-4 border-gray-700 shadow-lg">
                <span class="text-3xl font-bold text-gray-400">
                  {dao.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 class="text-4xl font-bold text-white mb-2">{dao.name}</h2>
              <p class="text-gray-400 text-lg">
                <a
                  href={`https://twitter.com/${dao.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-blue-400 transition-colors"
                >
                  @{dao.twitterHandle}
                </a>
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            {(['30', '90', '365'] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  timeRange === days
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                }`}
              >
                {days === '365' ? '1Y' : `${days}D`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics - Row 1: Follower Stats */}
      {growthMetrics && (
        <div>
          <h3 class="text-lg font-semibold text-gray-400 mb-4">Follower Metrics</h3>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-gradient-to-br from-blue-900/20 to-black rounded-xl p-6 border border-blue-800/50 shadow-lg">
              <p class="text-sm font-medium text-blue-400 mb-2">Current Followers</p>
              <p class="text-3xl font-bold text-white">{formatNumber(dao.followerCount)}</p>
            </div>

            <div class="bg-gradient-to-br from-green-900/20 to-black rounded-xl p-6 border border-green-800/50 shadow-lg">
              <p class="text-sm font-medium text-green-400 mb-2">
                {timeRange} Day Growth
              </p>
              <p class="text-3xl font-bold text-white">
                {growthMetrics.totalGrowth > 0 ? '+' : ''}
                {formatNumber(growthMetrics.totalGrowth)}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {growthMetrics.growthPct > 0 ? '+' : ''}
                {growthMetrics.growthPct.toFixed(2)}%
              </p>
            </div>

            <div class="bg-gradient-to-br from-purple-900/20 to-black rounded-xl p-6 border border-purple-800/50 shadow-lg">
              <p class="text-sm font-medium text-purple-400 mb-2">Avg Daily Growth</p>
              <p class="text-3xl font-bold text-white">
                {growthMetrics.avgDailyGrowth > 0 ? '+' : ''}
                {formatNumber(Math.round(growthMetrics.avgDailyGrowth))}
              </p>
              <p class="text-xs text-gray-400 mt-1">followers per day</p>
            </div>

            <div class="bg-gradient-to-br from-pink-900/20 to-black rounded-xl p-6 border border-pink-800/50 shadow-lg">
              <p class="text-sm font-medium text-pink-400 mb-2">Growth Rate</p>
              <p class="text-3xl font-bold text-white">
                {growthMetrics.growthPct > 0 ? '+' : ''}
                {growthMetrics.growthPct.toFixed(2)}%
              </p>
              <p class="text-xs text-gray-400 mt-1">over {timeRange} days</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics - Row 2: Engagement Stats */}
      {analytics && (
        <div>
          <h3 class="text-lg font-semibold text-gray-400 mb-4">Engagement Metrics</h3>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-gradient-to-br from-orange-900/20 to-black rounded-xl p-6 border border-orange-800/50 shadow-lg">
              <p class="text-sm font-medium text-orange-400 mb-2">Total Tweets</p>
              <p class="text-3xl font-bold text-white">
                {formatNumber(analytics.summary.totalTweets)}
              </p>
              <p class="text-xs text-gray-400 mt-1">last {timeRange} days</p>
            </div>

            <div class="bg-gradient-to-br from-red-900/20 to-black rounded-xl p-6 border border-red-800/50 shadow-lg">
              <p class="text-sm font-medium text-red-400 mb-2">Total Engagement</p>
              <p class="text-3xl font-bold text-white">
                {formatNumber(analytics.summary.totalEngagement)}
              </p>
              <p class="text-xs text-gray-400 mt-1">likes + retweets + replies</p>
            </div>

            <div class="bg-gradient-to-br from-cyan-900/20 to-black rounded-xl p-6 border border-cyan-800/50 shadow-lg">
              <p class="text-sm font-medium text-cyan-400 mb-2">Avg Engagement</p>
              <p class="text-3xl font-bold text-white">
                {formatNumber(analytics.summary.avgEngagement)}
              </p>
              <p class="text-xs text-gray-400 mt-1">per tweet</p>
            </div>

            <div class="bg-gradient-to-br from-yellow-900/20 to-black rounded-xl p-6 border border-yellow-800/50 shadow-lg">
              <p class="text-sm font-medium text-yellow-400 mb-2">Engagement Rate</p>
              <p class="text-3xl font-bold text-white">
                {(analytics.summary.engagementRate * 100).toFixed(3)}%
              </p>
              <p class="text-xs text-gray-400 mt-1">per follower</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower Growth Chart */}
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-lg overflow-hidden">
          <div class="px-6 py-5 border-b border-gray-800">
            <h3 class="text-xl font-bold text-white">Follower Growth</h3>
            <p class="text-sm text-gray-400 mt-1">Historical Twitter follower count</p>
          </div>
          <div class="p-6">
            {followers.length > 0 ? (
              <div style="height: 300px">
                <canvas ref={followerChartRef}></canvas>
              </div>
            ) : (
              <div class="flex items-center justify-center h-64 text-gray-500">
                No follower data available
              </div>
            )}
          </div>
        </div>

        {/* Posting Activity Chart */}
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-lg overflow-hidden">
          <div class="px-6 py-5 border-b border-gray-800">
            <h3 class="text-xl font-bold text-white">Posting Activity</h3>
            <p class="text-sm text-gray-400 mt-1">Tweets per day</p>
          </div>
          <div class="p-6">
            {analytics?.activityData.length ? (
              <div style="height: 300px">
                <canvas ref={activityChartRef}></canvas>
              </div>
            ) : (
              <div class="flex items-center justify-center h-64 text-gray-500">
                No activity data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performing Tweets */}
      {analytics && analytics.topTweets.length > 0 && (
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-lg overflow-hidden">
          <div class="px-6 py-5 border-b border-gray-800">
            <h3 class="text-xl font-bold text-white">Top Performing Tweets</h3>
            <p class="text-sm text-gray-400 mt-1">
              Most engaged tweets in the last {timeRange} days
            </p>
          </div>
          <div class="divide-y divide-gray-800">
            {analytics.topTweets.slice(0, 5).map((tweet) => {
              const metrics = tweet.metrics || {};
              const totalEngagement =
                (metrics.like_count || 0) +
                (metrics.retweet_count || 0) +
                (metrics.reply_count || 0);

              return (
                <div
                  key={tweet.id}
                  class="p-6 hover:bg-gray-900/30 transition-colors"
                >
                  <div class="flex items-start justify-between mb-3">
                    <p class="text-sm text-gray-400">
                      {new Date(tweet.tweetedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <a
                      href={`https://twitter.com/${dao.twitterHandle}/status/${tweet.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View Tweet →
                    </a>
                  </div>
                  <p class="text-white mb-4 line-clamp-3">{tweet.content}</p>
                  <div class="flex items-center gap-6 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="text-red-400">♥</span>
                      <span class="text-gray-400">
                        {formatNumber(metrics.like_count || 0)}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-green-400">↻</span>
                      <span class="text-gray-400">
                        {formatNumber(metrics.retweet_count || 0)}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-blue-400">↪</span>
                      <span class="text-gray-400">
                        {formatNumber(metrics.reply_count || 0)}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 ml-auto">
                      <span class="text-purple-400 font-semibold">
                        {formatNumber(totalEngagement)} total
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
