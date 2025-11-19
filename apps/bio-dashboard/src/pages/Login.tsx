import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { useAuth, supabase } from '../lib/auth';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    if (!supabase) {
      setError('⚠️ Configuration Error: Supabase environment variables are missing. Please rebuild the frontend with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
  }, []);

  const handlePasswordLogin = async (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signIn(email, password);
      route('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setSuccess('✅ Magic link sent! Check your email to sign in.');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-2">Bio Dashboard</h1>
            <p class="text-gray-400">Sign in to continue</p>
          </div>

          {/* Toggle between password and magic link */}
          <div class="flex gap-2 mb-6 p-1 bg-gray-900/50 rounded-lg">
            <button
              onClick={() => setUseMagicLink(false)}
              class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !useMagicLink
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setUseMagicLink(true)}
              class={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                useMagicLink
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Magic Link
            </button>
          </div>

          <form onSubmit={useMagicLink ? handleMagicLinkLogin : handlePasswordLogin} class="space-y-6">
            {error && (
              <div class="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div class="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm">
                {success}
              </div>
            )}

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder="your@email.com"
              />
            </div>

            {!useMagicLink && (
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  required={!useMagicLink}
                  class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? useMagicLink
                  ? 'Sending magic link...'
                  : 'Signing in...'
                : useMagicLink
                ? 'Send Magic Link'
                : 'Sign in'}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-gray-400">
            {useMagicLink ? (
              <>
                <p>We'll send you a secure link to sign in.</p>
                <p class="mt-2 text-xs">No password required!</p>
              </>
            ) : (
              <>
                <p>Access managed via Supabase Authentication.</p>
                <p class="mt-2 text-xs">Contact your administrator for access.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
