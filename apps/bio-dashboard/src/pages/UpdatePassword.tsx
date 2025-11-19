import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { supabase } from '../lib/auth';

export function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Check if this is a password recovery/invite session
    supabase.auth.getSession().then(({ data: { session } }: { data:  any }) => {
      if (session) {
        setIsRecovery(true);
        setUserEmail(session.user.email || '');
      } else {
        // No session, redirect to login
        route('/login');
      }
    });
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Password updated successfully, redirect to dashboard
      route('/');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-2">Set Your Password</h1>
            <p class="text-gray-400">Create a secure password for your account</p>
            {userEmail && (
              <p class="text-sm text-gray-500 mt-2">Account: {userEmail}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} class="space-y-6">
            {error && (
              <div class="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
                minLength={8}
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder="••••••••"
              />
              <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                required
                minLength={8}
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting password...' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

