import { useEffect, useState } from 'preact/hooks';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatNumber } from '../lib/utils';

interface DAOSummary {
  id: string;
  slug: string;
  name: string;
  twitterHandle: string;
  followerCount: number;
  followerGrowth: number;
  followerGrowthPct: number;
  totalPosts: number;
  lastSyncedAt: string | null;
  profileImageUrl: string | null;
}

interface EcosystemStats {
  totalDaos: number;
  totalFollowers: number;
  totalPosts: number;
  topDaos: Array<{ name: string; slug: string; followerCount: number }>;
  ecosystemGrowth: Array<{ date: string; totalFollowers: number }>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const API_BASE = 'http://localhost:4100';

export function DAOs() {
  const [daos, setDaos] = useState<DAOSummary[]>([]);
  const [ecosystem, setEcosystem] = useState<EcosystemStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'followers' | 'growth' | 'posts'>('followers');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [daosResponse, ecosystemResponse] = await Promise.all([
        fetch(`${API_BASE}/daos?page=${currentPage}&limit=12`),
        fetch(`${API_BASE}/daos/stats/ecosystem`),
      ]);

      const daosData = await daosResponse.json();
      const ecosystemData = await ecosystemResponse.json();

      if (daosData.success) {
        setDaos(daosData.data);
        setPagination(daosData.pagination);
      }

      if (ecosystemData.success) {
        setEcosystem(ecosystemData.data);
      }
    } catch (err) {
      console.error('Error loading DAO data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const sortedDaos = [...daos].sort((a, b) => {
    switch (sortBy) {
      case 'followers':
        return b.followerCount - a.followerCount;
      case 'growth':
        return b.followerGrowthPct - a.followerGrowthPct;
      case 'posts':
        return b.totalPosts - a.totalPosts;
      default:
        return 0;
    }
  });

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

  return (
    <div class="space-y-8">
      {/* Header */}
      <div>
        <h2 class="text-4xl font-bold text-white mb-2">DAO Ecosystem Analytics</h2>
        <p class="text-gray-400 text-lg">
          Track 41 DAOs across the BioProtocol ecosystem
        </p>
      </div>

      {/* Ecosystem Overview Cards */}
      {ecosystem && (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-gradient-to-br from-blue-900/20 to-black rounded-xl p-6 border border-blue-800/50 shadow-lg">
            <p class="text-sm font-medium text-blue-400 mb-2">Total Ecosystem Reach</p>
            <p class="text-4xl font-bold text-white mb-1">
              {formatNumber(ecosystem.totalFollowers)}
            </p>
            <p class="text-xs text-gray-400">Combined Twitter followers</p>
          </div>

          <div class="bg-gradient-to-br from-purple-900/20 to-black rounded-xl p-6 border border-purple-800/50 shadow-lg">
            <p class="text-sm font-medium text-purple-400 mb-2">Active DAOs</p>
            <p class="text-4xl font-bold text-white mb-1">{ecosystem.totalDaos}</p>
            <p class="text-xs text-gray-400">Organizations tracked</p>
          </div>

          <div class="bg-gradient-to-br from-green-900/20 to-black rounded-xl p-6 border border-green-800/50 shadow-lg">
            <p class="text-sm font-medium text-green-400 mb-2">Total Content</p>
            <p class="text-4xl font-bold text-white mb-1">
              {formatNumber(ecosystem.totalPosts)}
            </p>
            <p class="text-xs text-gray-400">Twitter posts collected</p>
          </div>
        </div>
      )}

      {/* Top DAOs Quick View */}
      {ecosystem && ecosystem.topDaos.length > 0 && (
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-lg overflow-hidden">
          <div class="px-6 py-5 border-b border-gray-800">
            <h3 class="text-xl font-bold text-white">Top 5 DAOs by Reach</h3>
            <p class="text-sm text-gray-400 mt-1">Leading organizations in the ecosystem</p>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              {ecosystem.topDaos.map((dao, index) => (
                <div
                  key={dao.slug}
                  class="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-all"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                        index === 0
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white'
                          : index === 1
                            ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                            : index === 2
                              ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white'
                              : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p class="font-semibold text-white">{dao.name}</p>
                      <p class="text-sm text-gray-500">@{dao.slug}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-2xl font-bold text-white">
                      {formatNumber(dao.followerCount || 0)}
                    </p>
                    <p class="text-xs text-gray-500">followers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div class="flex items-center gap-4">
        <span class="text-sm font-semibold text-gray-400">Sort by:</span>
        <div class="flex gap-2">
          {[
            { value: 'followers', label: 'Followers' },
            { value: 'growth', label: '30d Growth' },
            { value: 'posts', label: 'Activity' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value as any)}
              class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                sortBy === option.value
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* DAO Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedDaos.map((dao) => (
          <a
            key={dao.id}
            href={`/daos/${dao.slug}`}
            class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all shadow-lg hover:shadow-xl cursor-pointer group block"
          >
            {/* DAO Header with Profile Image */}
            <div class="flex items-start gap-4 mb-4">
              {dao.profileImageUrl ? (
                <img
                  src={dao.profileImageUrl}
                  alt={`${dao.name} profile`}
                  class="w-12 h-12 rounded-full border-2 border-gray-700 group-hover:border-blue-500 transition-colors"
                />
              ) : (
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border-2 border-gray-700 group-hover:border-blue-500 transition-colors">
                  <span class="text-xl font-bold text-gray-400">
                    {dao.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors truncate">
                  {dao.name}
                </h3>
                <p class="text-sm text-gray-500">@{dao.twitterHandle}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div class="space-y-3">
              {/* Followers */}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-400">Followers</span>
                <span class="text-lg font-bold text-white">
                  {formatNumber(dao.followerCount)}
                </span>
              </div>

              {/* Growth */}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-400">30d Growth</span>
                <span
                  class={`text-sm font-bold ${
                    dao.followerGrowthPct > 0
                      ? 'text-green-400'
                      : dao.followerGrowthPct < 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                  }`}
                >
                  {dao.followerGrowthPct > 0 ? '+' : ''}
                  {dao.followerGrowthPct.toFixed(1)}%
                  {dao.followerGrowth !== 0 && (
                    <span class="text-xs ml-1">
                      ({dao.followerGrowth > 0 ? '+' : ''}
                      {formatNumber(dao.followerGrowth)})
                    </span>
                  )}
                </span>
              </div>

              {/* Posts */}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-400">Total Posts</span>
                <span class="text-sm font-semibold text-white">
                  {formatNumber(dao.totalPosts)}
                </span>
              </div>
            </div>

            {/* Last Sync Status */}
            <div class="mt-4 pt-4 border-t border-gray-800">
              <p class="text-xs text-gray-500">
                {dao.lastSyncedAt
                  ? `Last synced ${new Date(dao.lastSyncedAt).toLocaleDateString()}`
                  : 'Not synced recently'}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div class="flex items-center justify-center gap-2 pt-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentPage === 1
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 border border-gray-800'
            }`}
          >
            Previous
          </button>

          <div class="flex items-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const shouldShow =
                page === 1 ||
                page === pagination.totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              const shouldShowEllipsisBefore = page === currentPage - 2 && currentPage > 3;
              const shouldShowEllipsisAfter =
                page === currentPage + 2 && currentPage < pagination.totalPages - 2;

              return (
                <>
                  {shouldShowEllipsisBefore && (
                    <span class="text-gray-600 px-2">...</span>
                  )}
                  {shouldShow && (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      class={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                      }`}
                    >
                      {page}
                    </button>
                  )}
                  {shouldShowEllipsisAfter && (
                    <span class="text-gray-600 px-2">...</span>
                  )}
                </>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentPage === pagination.totalPages
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 border border-gray-800'
            }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Pagination Info */}
      {pagination && (
        <div class="text-center text-sm text-gray-500">
          Showing {(pagination.page - 1) * pagination.limit + 1}-
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
          DAOs
        </div>
      )}
    </div>
  );
}
