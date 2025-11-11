import { useState, useEffect } from 'preact/hooks';
import { useAuth, supabase } from '../lib/auth';

interface Invite {
  id: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export function Invites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadInvites();
    }
  }, [user]);

  const getAuthHeader = async () => {
    const session = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session.data.session?.access_token}`,
    };
  };

  const loadInvites = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/invites`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites);
      }
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/invites`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Invite created successfully!`);
        setNewEmail('');
        setShowForm(false);
        loadInvites();

        // Show invite link
        const inviteUrl = `${window.location.origin}/signup/${data.invite.inviteToken}`;
        navigator.clipboard.writeText(inviteUrl);
        alert(`Invite link copied to clipboard:\n\n${inviteUrl}`);
      } else {
        setError(data.error || 'Failed to create invite');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invite');
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/invites/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        setSuccess('Invite revoked successfully');
        loadInvites();
      } else {
        setError('Failed to revoke invite');
      }
    } catch (err) {
      setError('Failed to revoke invite');
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/invites/${id}/resend`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        const inviteUrl = `${window.location.origin}/signup/${data.invite.inviteToken}`;
        navigator.clipboard.writeText(inviteUrl);
        setSuccess('New invite link copied to clipboard!');
        loadInvites();
      } else {
        setError('Failed to resend invite');
      }
    } catch (err) {
      setError('Failed to resend invite');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div class="text-center py-12">
        <p class="text-gray-400">Admin access required</p>
      </div>
    );
  }

  return (
    <div>
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Invite Management</h1>
          <p class="text-gray-400">Manage user invitations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Invite'}
        </button>
      </div>

      {(error || success) && (
        <div class={`mb-6 p-4 rounded-lg ${error ? 'bg-red-500/10 border border-red-500/50 text-red-400' : 'bg-green-500/10 border border-green-500/50 text-green-400'}`}>
          {error || success}
        </div>
      )}

      {showForm && (
        <div class="bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-700">
          <h2 class="text-xl font-semibold text-white mb-4">Create New Invite</h2>
          <form onSubmit={handleCreateInvite} class="flex gap-4">
            <input
              type="email"
              value={newEmail}
              onInput={(e) => setNewEmail((e.target as HTMLInputElement).value)}
              placeholder="user@example.com"
              required
              class="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            />
            <button
              type="submit"
              class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Create Invite
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      ) : (
        <div class="bg-gray-800/30 rounded-xl overflow-hidden border border-gray-700">
          <table class="w-full">
            <thead class="bg-gray-800/50">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Invited By</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Expires</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              {invites.map((invite) => (
                <tr key={invite.id} class="hover:bg-gray-800/30 transition-colors">
                  <td class="px-6 py-4 text-white">{invite.email}</td>
                  <td class="px-6 py-4">
                    <span class={`px-3 py-1 rounded-full text-xs font-medium ${
                      invite.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      invite.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                      invite.status === 'expired' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {invite.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-gray-400">{invite.invitedBy}</td>
                  <td class="px-6 py-4 text-gray-400">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </td>
                  <td class="px-6 py-4">
                    {invite.status === 'pending' && (
                      <div class="flex gap-2">
                        <button
                          onClick={() => handleResendInvite(invite.id)}
                          class="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          class="text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
