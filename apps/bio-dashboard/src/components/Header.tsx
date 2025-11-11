export function Header() {
  return (
    <header class="bg-black border-b border-gray-800 px-8 py-5 backdrop-blur-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Bio Internal Dashboard</h1>
          <p class="text-sm text-gray-500 mt-1">Growth Analytics & Marketing Metrics</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg">
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span class="text-sm font-medium text-gray-400">Live</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
