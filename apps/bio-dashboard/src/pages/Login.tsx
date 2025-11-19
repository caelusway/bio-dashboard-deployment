import { useState, useEffect } from 'preact/hooks';
import { supabase } from '../lib/auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    if (!supabase) {
      setError('⚠️ Configuration Error: Supabase environment variables are missing. Please rebuild the frontend with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
  }, []);

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
    <div class="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      <div class="max-w-md w-full relative z-10">
        {/* Logo and branding */}
        <div class="text-center mb-8">
          <div class="flex items-center justify-center mb-6">
            {/* Bio Logo */}
            <div class="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <img 
                src="/logo.jpg" 
                alt="Bio Logo" 
                class="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h1 class="text-4xl font-bold text-white mb-1">
            Bio Dashboard
          </h1>
          <p class="text-gray-500 text-sm">Analytics & Insights Platform</p>
        </div>

        {/* Login card */}
        <div class="bg-gray-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-800 overflow-hidden">
          <div class="p-8">
            <div class="text-center mb-8">
              <h2 class="text-2xl font-semibold text-white mb-2">Welcome back</h2>
              <p class="text-gray-400">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleMagicLinkLogin} class="space-y-6">
              {error && (
                <div class="bg-red-500/10 backdrop-blur-sm border border-red-500/50 rounded-xl p-4 text-red-300 text-sm flex items-start gap-3">
                  <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div class="bg-green-500/10 backdrop-blur-sm border border-green-500/50 rounded-xl p-4 text-green-300 text-sm flex items-start gap-3">
                  <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Email address</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                    required
                    class="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white placeholder-gray-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Sending magic link...</span>
                  </>
                ) : (
                  <>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Send Magic Link</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info section */}
          <div class="px-8 py-6 bg-gray-900/30 border-t border-gray-800">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 mt-0.5">
                <div class="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 class="text-sm font-medium text-white mb-1">Passwordless Authentication</h3>
                <p class="text-xs text-gray-400 leading-relaxed">
                  We'll send a secure, one-time link to your email. Click it to sign in instantly—no password needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div class="mt-8 text-center">
          <p class="text-sm text-gray-500">
            Need access? <span class="text-gray-400">Contact your administrator</span>
          </p>
        </div>
      </div>
    </div>
  );
}
