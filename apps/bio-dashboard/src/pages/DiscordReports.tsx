import { useState, useEffect } from 'preact/hooks';
import { marked } from 'marked';
import { exportReportToPDF } from '../lib/pdfExport';
import { authenticatedFetch } from '../lib/api';
import '../styles/markdown.css';

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface DiscordReport {
  id: string;
  channelId: string;
  reportType: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  content: string;
  summary: string | null;
  status: string;
  metadata: any;
  createdAt: string;
  channelName: string;
  channelCategory: string | null;
  daoId: string | null;
  daoName: string | null;
  daoSlug: string | null;
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

export function DiscordReports() {
  const [reports, setReports] = useState<DiscordReport[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [stats, setStats] = useState<DiscordStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DiscordReport | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Filters
  const [filterReportType, setFilterReportType] = useState<string>('');
  const [filterDao, setFilterDao] = useState<string>('');
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [hideEmpty, setHideEmpty] = useState<boolean>(true); // Default to hiding empty reports

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetchData();
  }, [filterReportType, filterDao, filterChannel, hideEmpty]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filterReportType) params.append('reportType', filterReportType);
      if (filterDao) params.append('daoId', filterDao);
      if (filterChannel) params.append('channelId', filterChannel);
      if (hideEmpty) params.append('hideEmpty', 'true');

      console.log('🔍 Fetching Discord reports from:', apiUrl);
      console.log('Reports URL:', `${apiUrl}/api/discord/reports?${params.toString()}`);

      const [reportsRes, channelsRes, statsRes] = await Promise.all([
        authenticatedFetch(`${apiUrl}/api/discord/reports?${params.toString()}`),
        authenticatedFetch(`${apiUrl}/api/discord/channels`),
        authenticatedFetch(`${apiUrl}/api/discord/stats`),
      ]);

      console.log('📄 Reports response status:', reportsRes.status);
      console.log('📡 Channels response status:', channelsRes.status);
      console.log('📊 Stats response status:', statsRes.status);

      const reportsData = await reportsRes.json();
      const channelsData = await channelsRes.json();
      const statsData = await statsRes.json();

      console.log('📄 Reports data:', reportsData);
      console.log('📡 Channels data:', channelsData);
      console.log('📊 Stats data:', statsData);

      if (reportsData.success) {
        console.log('✅ Setting reports:', reportsData.data.length, 'reports');
        setReports(reportsData.data);
      } else {
        console.error('❌ Reports fetch failed:', reportsData.error);
      }

      if (channelsData.success) {
        console.log('✅ Setting channels:', channelsData.data.length, 'channels');
        setChannels(channelsData.data);
      } else {
        console.error('❌ Channels fetch failed:', channelsData.error);
      }

      if (statsData.success) {
        console.log('✅ Setting stats:', statsData.data);
        setStats(statsData.data);
      } else {
        console.error('❌ Stats fetch failed:', statsData.error);
      }
    } catch (error) {
      console.error('❌ Error fetching Discord data:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = (report: DiscordReport) => {
    setSelectedReport(report);
  };

  const closeReport = () => {
    setSelectedReport(null);
  };

  const handleExportPDF = async (report: DiscordReport) => {
    setExportingPDF(true);
    try {
      await exportReportToPDF(report.content, {
        reportType: report.reportType,
        channelName: report.channelName,
        channelCategory: report.channelCategory || undefined,
        daoName: report.daoName || undefined,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        stats: report.metadata?.stats,
        analysis: report.metadata?.analysis,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get unique DAOs from channels
  const uniqueDaos = Array.from(
    new Map(
      channels
        .filter(c => c.daoId && c.daoName)
        .map(c => [c.daoId, { id: c.daoId, name: c.daoName, slug: c.daoSlug }])
    ).values()
  );

  return (
    <div class="p-6">
      {/* Header */}
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Discord Reports</h1>
        <p class="text-gray-400">AI-powered insights from Discord community activity</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-gray-950 rounded-lg p-6 border border-gray-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">Total Channels</p>
                <p class="text-3xl font-bold text-white mt-1">{stats.totalChannels}</p>
              </div>
              <div class="bg-blue-500/20 p-3 rounded-lg">
                <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-gray-950 rounded-lg p-6 border border-gray-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">Total Messages</p>
                <p class="text-3xl font-bold text-white mt-1">{stats.totalMessages.toLocaleString()}</p>
              </div>
              <div class="bg-green-500/20 p-3 rounded-lg">
                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-gray-950 rounded-lg p-6 border border-gray-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">Total Reports</p>
                <p class="text-3xl font-bold text-white mt-1">{stats.totalReports}</p>
              </div>
              <div class="bg-purple-500/20 p-3 rounded-lg">
                <svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div class="bg-gray-950 rounded-lg p-6 border border-gray-800 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">Filters</h2>
          
          {/* Hide Empty Reports Toggle */}
          <label class="flex items-center gap-3 cursor-pointer">
            <span class="text-sm text-gray-300">Hide Empty Reports</span>
            <div class="relative">
              <input
                type="checkbox"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty((e.target as HTMLInputElement).checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
            <select
              value={filterReportType}
              onChange={(e) => setFilterReportType((e.target as HTMLSelectElement).value)}
              class="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">DAO/Project</label>
            <select
              value={filterDao}
              onChange={(e) => setFilterDao((e.target as HTMLSelectElement).value)}
              class="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All DAOs</option>
              {uniqueDaos.map(dao => (
                <option key={dao.id || dao.name} value={dao.id || ''}>{dao.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Channel</label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel((e.target as HTMLSelectElement).value)}
              class="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Channels</option>
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>
                  {channel.category ? `${channel.category} / ` : ''}{channel.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div class="bg-gray-950 rounded-lg border border-gray-800">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-xl font-semibold text-white">Reports</h2>
        </div>

        {loading ? (
          <div class="p-12 text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
            <p class="text-gray-400 mt-4">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div class="p-12 text-center">
            <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-gray-400">No reports found</p>
            <p class="text-gray-500 text-sm mt-2">Reports will appear here once generated</p>
          </div>
        ) : (
          <div class="divide-y divide-gray-700">
            {reports.map(report => (
              <div
                key={report.id}
                class="p-6 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => viewReport(report)}
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <span class={`px-3 py-1 rounded-full text-xs font-medium ${
                        report.reportType === 'weekly' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)}
                      </span>
                      {report.daoName && (
                        <span class="text-gray-400 text-sm">{report.daoName}</span>
                      )}
                    </div>
                    <h3 class="text-lg font-semibold text-white mb-1">
                      {report.channelCategory && `${report.channelCategory} / `}
                      {report.channelName}
                    </h3>
                    <p class="text-gray-400 text-sm">
                      {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                    </p>
                    {report.summary && (
                      <p class="text-gray-300 mt-2 line-clamp-2">{report.summary}</p>
                    )}
                  </div>
                  <div class="ml-4">
                    <button class="text-blue-400 hover:text-blue-300 transition-colors">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={closeReport}>
          <div 
            class="bg-gray-950 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div class="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 p-6">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-3">
                    <span class={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      selectedReport.reportType === 'weekly' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      📝 {selectedReport.reportType.charAt(0).toUpperCase() + selectedReport.reportType.slice(1)} Report
                    </span>
                    {selectedReport.daoName && (
                      <span class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                        {selectedReport.daoName}
                      </span>
                    )}
                  </div>
                  <h2 class="text-2xl font-bold text-white mb-2">
                    {selectedReport.channelCategory && (
                      <span class="text-gray-400">{selectedReport.channelCategory} / </span>
                    )}
                    {selectedReport.channelName}
                  </h2>
                  
                  {/* Metadata Bar */}
                  <div class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-2 text-gray-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(selectedReport.periodStart)} - {formatDate(selectedReport.periodEnd)}</span>
                    </div>
                    
                    {selectedReport.metadata?.stats && (
                      <>
                        <div class="h-4 w-px bg-gray-700"></div>
                        <div class="flex items-center gap-2 text-gray-400">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{selectedReport.metadata.stats.totalMessages} messages</span>
                        </div>
                        
                        <div class="h-4 w-px bg-gray-700"></div>
                        <div class="flex items-center gap-2 text-gray-400">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>{selectedReport.metadata.stats.uniqueAuthors} contributors</span>
                        </div>
                      </>
                    )}
                    
                    {selectedReport.metadata?.analysis && (
                      <>
                        <div class="h-4 w-px bg-gray-700"></div>
                        <div class="flex items-center gap-2">
                          <span class={`px-2 py-1 rounded text-xs font-medium ${
                            selectedReport.metadata.analysis.sentiment === 'positive' 
                              ? 'bg-green-500/20 text-green-400'
                              : selectedReport.metadata.analysis.sentiment === 'negative'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {selectedReport.metadata.analysis.sentiment === 'positive' ? '🟢' : 
                             selectedReport.metadata.analysis.sentiment === 'negative' ? '🔴' : '🟡'} 
                            {selectedReport.metadata.analysis.sentiment.toUpperCase()}
                          </span>
                          <span class={`px-2 py-1 rounded text-xs font-medium ${
                            selectedReport.metadata.analysis.engagementLevel === 'high'
                              ? 'bg-orange-500/20 text-orange-400'
                              : selectedReport.metadata.analysis.engagementLevel === 'low'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {selectedReport.metadata.analysis.engagementLevel === 'high' ? '🔥' :
                             selectedReport.metadata.analysis.engagementLevel === 'low' ? '❄️' : '⚡'}
                            {selectedReport.metadata.analysis.engagementLevel.toUpperCase()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div class="flex items-center gap-2 ml-4">
                  {/* Export PDF Button */}
                  <button
                    onClick={() => handleExportPDF(selectedReport)}
                    disabled={exportingPDF}
                    class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export to PDF"
                  >
                    {exportingPDF ? (
                      <>
                        <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export PDF</span>
                      </>
                    )}
                  </button>
                  
                  {/* Close Button */}
                  <button
                    onClick={closeReport}
                    class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
                    title="Close"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div class="flex-1 overflow-y-auto p-8 bg-gray-950">
              <div 
                class="discord-report-content"
                dangerouslySetInnerHTML={{ __html: marked.parse(selectedReport.content) as string }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

