import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { useAuth } from '../lib/auth';

export function Signup({ token }: { token: string }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);

  useEffect(() => {
    // Verify invite token
    verifyInvite();
  }, [token]);

  const verifyInvite = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-invite/${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setInviteValid(true);
        setEmail(data.email);
      } else {
        setError(data.error || 'Invalid or expired invite');
        setInviteValid(false);
      }
    } catch (err) {
      setError('Failed to verify invite');
      setInviteValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, fullName, token);
      route('/');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p class="text-gray-400">Verifying invite...</p>
        </div>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div class="text-center">
            <div class="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 class="text-2xl font-bold text-white mb-2">Invalid Invite</h2>
            <p class="text-gray-400 mb-6">{error}</p>
            <a
              href="/login"
              class="text-purple-400 hover:text-purple-300 font-medium"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-2">Create Your Account</h1>
            <p class="text-gray-400">Welcome to Bio Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} class="space-y-6">
            {error && (
              <div class="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled
                class="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p class="text-xs text-gray-500 mt-1">This email was invited to join</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
                required
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
                minLength={8}
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder="••••••••"
              />
              <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <a href="/login" class="text-purple-400 hover:text-purple-300 font-medium">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
