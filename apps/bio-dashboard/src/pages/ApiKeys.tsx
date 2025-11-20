import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../lib/auth';
import { API_URL } from '../lib/utils';
import { authenticatedFetch } from '../lib/api';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface NewKeyResponse {
  success: boolean;
  data?: ApiKey & { key: string };
  warning?: string;
  error?: string;
}

export function ApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpires, setNewKeyExpires] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('../lib/auth');
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch API keys');

      const data = await response.json();
      if (data.success) {
        setKeys(data.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: Event) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const session = await (await import('../lib/auth')).supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newKeyName,
          expiresInDays: newKeyExpires ? parseInt(newKeyExpires) : undefined,
        }),
      });

      const data: NewKeyResponse = await response.json();

      if (data.success && data.data) {
        setCreatedKey(data.data.key);
        setNewKeyName('');
        setNewKeyExpires('');
        fetchKeys();
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const session = await (await import('../lib/auth')).supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/keys/${keyId}/revoke`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        fetchKeys();
      } else {
        setError(data.error || 'Failed to revoke API key');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (user?.role !== 'admin') {
    return (
      <div class="p-8">
        <div class="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-red-300">
          <h2 class="text-xl font-semibold mb-2">Access Denied</h2>
          <p>Only administrators can manage API keys.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">API Keys</h1>
          <p class="text-gray-400 mt-1">Manage API keys for external applications</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Generate New Key
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div class="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      {/* API Keys List */}
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div class="p-12 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p class="text-gray-400 mt-4">Loading API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div class="p-12 text-center">
            <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 class="text-xl font-semibold text-white mb-2">No API Keys</h3>
            <p class="text-gray-400">Create your first API key to get started</p>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Key Prefix</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Used</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Expires</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                {keys.map((key) => (
                  <tr key={key.id} class="hover:bg-gray-800/50 transition-colors">
                    <td class="px-6 py-4 text-sm font-medium text-white">{key.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-400 font-mono">{key.keyPrefix}...</td>
                    <td class="px-6 py-4 text-sm">
                      {key.isActive ? (
                        <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Active</span>
                      ) : (
                        <span class="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">Revoked</span>
                      )}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-400">{formatDate(key.lastUsedAt)}</td>
                    <td class="px-6 py-4 text-sm text-gray-400">{key.expiresAt ? formatDate(key.expiresAt) : 'Never'}</td>
                    <td class="px-6 py-4 text-sm text-gray-400">{formatDate(key.createdAt)}</td>
                    <td class="px-6 py-4 text-right">
                      {key.isActive && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          class="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Usage Instructions</h2>
        <div class="space-y-4 text-gray-400">
          <p>To use an API key, include it in the <code class="bg-gray-800 px-2 py-1 rounded text-blue-400">X-API-Key</code> header:</p>
          <pre class="bg-black border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm">
{`curl -H "X-API-Key: bio_live_xxxxx" \\
  ${API_URL}/api/discord/channels`}
          </pre>
          <p class="text-sm">
            <strong class="text-white">Security Note:</strong> API keys have full read access to all endpoints. Keep them secure and never commit them to version control.
          </p>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 class="text-2xl font-bold text-white mb-4">Generate New API Key</h2>
            
            {createdKey ? (
              <div class="space-y-4">
                <div class="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 text-yellow-300 text-sm">
                  <strong>⚠️ Important:</strong> Save this key now. You won't be able to see it again!
                </div>
                
                <div class="bg-black border border-gray-800 rounded-lg p-4">
                  <div class="flex items-center justify-between gap-2">
                    <code class="text-blue-400 text-sm break-all">{createdKey}</code>
                    <button
                      onClick={() => copyToClipboard(createdKey)}
                      class="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setCreatedKey(null);
                    setShowCreateModal(false);
                  }}
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onInput={(e) => setNewKeyName((e.target as HTMLInputElement).value)}
                    placeholder="e.g., Production App, Analytics Service"
                    required
                    class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Expires In (days)</label>
                  <input
                    type="number"
                    value={newKeyExpires}
                    onInput={(e) => setNewKeyExpires((e.target as HTMLInputElement).value)}
                    placeholder="Leave empty for no expiration"
                    min="1"
                    max="3650"
                    class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p class="text-xs text-gray-500 mt-1">Optional. Max 10 years (3650 days)</p>
                </div>
                
                <div class="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    class="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

