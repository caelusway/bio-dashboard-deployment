import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';

interface DiscordStats {
  totalChannels: number;
  totalMessages: number;
  totalReports: number;
  messagesByDao: Array<{
    daoId: string;
    daoName: string;
    daoSlug: string;
    messageCount: number;
  }>;
  latestSync: Array<{
    channelName: string;
    lastSyncedAt: string | null;
  }>;
}

interface DiscordChannel {
  id: string;
  channelId: string;
  name: string;
  type: string;
  category: string | null;
  isForum: boolean;
  lastSyncedAt: string | null;
  daoId: string | null;
  daoName: string | null;
  daoSlug: string | null;
}

export function DiscordOverview() {
  const [stats, setStats] = useState<DiscordStats | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching Discord data from:', apiUrl);
      console.log('Stats URL:', `${apiUrl}/api/discord/stats`);
      console.log('Channels URL:', `${apiUrl}/api/discord/channels`);

      const [statsRes, channelsRes] = await Promise.all([
        fetch(`${apiUrl}/api/discord/stats`),
        fetch(`${apiUrl}/api/discord/channels`),
      ]);

      console.log('📊 Stats response status:', statsRes.status);
      console.log('📡 Channels response status:', channelsRes.status);

      const statsData = await statsRes.json();
      const channelsData = await channelsRes.json();

      console.log('📊 Stats data:', statsData);
      console.log('📡 Channels data:', channelsData);

      if (statsData.success) {
        console.log('✅ Setting stats:', statsData.data);
        setStats(statsData.data);
      } else {
        console.error('❌ Stats fetch failed:', statsData.error);
      }

      if (channelsData.success) {
        console.log('✅ Setting channels:', channelsData.data.length, 'channels');
        setChannels(channelsData.data);
      } else {
        console.error('❌ Channels fetch failed:', channelsData.error);
      }
    } catch (error) {
      console.error('❌ Error fetching Discord data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Group channels by DAO
  const channelsByDao = channels.reduce((acc, channel) => {
    if (!channel.daoId || !channel.daoName) return acc;
    if (!acc[channel.daoId]) {
      acc[channel.daoId] = {
        daoId: channel.daoId,
        daoName: channel.daoName,
        daoSlug: channel.daoSlug,
        channels: [],
      };
    }
    acc[channel.daoId].channels.push(channel);
    return acc;
  }, {} as Record<string, { daoId: string; daoName: string; daoSlug: string | null; channels: DiscordChannel[] }>);

  const daoList = Object.values(channelsByDao).sort((a, b) => 
    b.channels.length - a.channels.length
  );

  // Get unique DAOs count
  const uniqueDaosCount = daoList.length;

  // Calculate average messages per DAO
  const avgMessagesPerDao = stats ? Math.floor(stats.totalMessages / (uniqueDaosCount || 1)) : 0;

  return (
    <div class="p-6">
      {/* Header */}
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Discord Ecosystem</h1>
        <p class="text-gray-400">Real-time insights from Bio Protocol's Discord community</p>
      </div>

      {loading ? (
        <div class="flex items-center justify-center py-20">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
            <p class="text-gray-400 mt-4">Loading Discord data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* DAOs Tracked */}
            <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-gray-800/50">
              <div class="flex items-center justify-between mb-4">
                <div class="bg-blue-500/20 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span class="text-blue-400 text-xs font-medium">ECOSYSTEM</span>
              </div>
              <div class="mb-1">
                <div class="text-4xl font-bold text-white">{uniqueDaosCount}</div>
                <div class="text-sm text-gray-400 mt-1">DAOs Tracked</div>
              </div>
            </div>

            {/* Total Channels */}
            <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-gray-800/50">
              <div class="flex items-center justify-between mb-4">
                <div class="bg-purple-500/20 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <span class="text-purple-400 text-xs font-medium">CHANNELS</span>
              </div>
              <div class="mb-1">
                <div class="text-4xl font-bold text-white">{stats?.totalChannels || 0}</div>
                <div class="text-sm text-gray-400 mt-1">Active Channels</div>
              </div>
            </div>

            {/* Total Messages */}
            <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-gray-800/50">
              <div class="flex items-center justify-between mb-4">
                <div class="bg-green-500/20 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span class="text-green-400 text-xs font-medium">ACTIVITY</span>
              </div>
              <div class="mb-1">
                <div class="text-4xl font-bold text-white">{formatNumber(stats?.totalMessages || 0)}</div>
                <div class="text-sm text-gray-400 mt-1">Total Messages</div>
              </div>
            </div>

            {/* AI Reports */}
            <div class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-6 border border-gray-800/50">
              <div class="flex items-center justify-between mb-4">
                <div class="bg-orange-500/20 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span class="text-orange-400 text-xs font-medium">INSIGHTS</span>
              </div>
              <div class="mb-1">
                <div class="text-4xl font-bold text-white">{stats?.totalReports || 0}</div>
                <div class="text-sm text-gray-400 mt-1">AI Reports</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => route('/discord-reports')}
              class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl p-6 text-left transition-all transform hover:scale-[1.02] border border-gray-800/50"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="bg-white/10 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-white mb-2">View AI Reports</h3>
              <p class="text-blue-100 text-sm">Browse weekly and monthly AI-powered insights from all channels</p>
            </button>

            <div class="bg-gray-950 rounded-xl p-6 border border-gray-800">
              <div class="flex items-center justify-between mb-3">
                <div class="bg-gray-800 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Real-time Sync</h3>
              <p class="text-gray-400 text-sm">Messages are automatically synced 24/7 from all tracked channels</p>
              <div class="mt-4 flex items-center gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-green-400 text-xs font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {/* Top DAOs by Activity */}
          <div class="bg-gray-950 rounded-xl border border-gray-800 mb-8">
            <div class="p-6 border-b border-gray-800">
              <h2 class="text-xl font-semibold text-white">Top DAOs by Activity</h2>
              <p class="text-gray-400 text-sm mt-1">Most active communities in the ecosystem</p>
            </div>
            <div class="p-6">
              <div class="space-y-4">
                {stats?.messagesByDao.slice(0, 10).map((dao, index) => {
                  const percentage = ((dao.messageCount / (stats.totalMessages || 1)) * 100).toFixed(1);
                  return (
                    <div key={dao.daoId} class="flex items-center gap-4">
                      <div class="flex-shrink-0 w-8 text-center">
                        <span class={`text-lg font-bold ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-gray-300' :
                          index === 2 ? 'text-orange-400' :
                          'text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-white font-medium">{dao.daoName}</span>
                          <span class="text-gray-400 text-sm">{dao.messageCount.toLocaleString()} messages</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            class={`h-full rounded-full transition-all ${
                              index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                              index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                              index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                              'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div class="flex-shrink-0 w-16 text-right">
                        <span class="text-gray-400 text-sm">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DAOs Grid */}
          <div class="bg-gray-950 rounded-xl border border-gray-800">
            <div class="p-6 border-b border-gray-800">
              <h2 class="text-xl font-semibold text-white">All DAOs</h2>
              <p class="text-gray-400 text-sm mt-1">{uniqueDaosCount} DAOs with {stats?.totalChannels || 0} channels tracked</p>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {daoList.map(dao => (
                  <div key={dao.daoId} class="bg-gray-950 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
                    <div class="flex items-start justify-between mb-3">
                      <h3 class="text-white font-semibold">{dao.daoName}</h3>
                      <span class="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                        {dao.channels.length} {dao.channels.length === 1 ? 'channel' : 'channels'}
                      </span>
                    </div>
                    <div class="space-y-1">
                      {dao.channels.slice(0, 3).map(channel => (
                        <div key={channel.id} class="flex items-center gap-2 text-sm">
                          <div class="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                          <span class="text-gray-400 truncate">{channel.name}</span>
                          {channel.isForum && (
                            <span class="text-purple-400 text-xs">📝</span>
                          )}
                        </div>
                      ))}
                      {dao.channels.length > 3 && (
                        <div class="text-xs text-gray-500 pl-3.5">
                          +{dao.channels.length - 3} more
                        </div>
                      )}
                    </div>
                    <div class="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                      <span class="text-gray-500">Last sync</span>
                      <span class="text-gray-400">
                        {formatDate(dao.channels[0]?.lastSyncedAt || null)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

