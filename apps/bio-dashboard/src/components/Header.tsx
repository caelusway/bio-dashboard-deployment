import { useAuth } from '../lib/auth';

export function Header() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut();
    }
  };

  return (
    <header class="bg-black border-b border-gray-800 px-8 py-5 backdrop-blur-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Bio Internal Dashboard</h1>
          <p class="text-sm text-gray-500 mt-1">Growth Analytics & Marketing Metrics</p>
        </div>
        <div class="flex items-center gap-6">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span class="text-sm font-medium text-gray-400">Live</span>
          </div>
          {user && (
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-sm font-medium text-white">{user.fullName || user.email}</div>
                {user.role === 'admin' && (
                  <div class="text-xs text-purple-400 font-medium">Admin</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
