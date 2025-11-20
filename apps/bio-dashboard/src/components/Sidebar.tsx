import { Link } from 'preact-router/match';
import { useState } from 'preact/hooks';
import { PlatformIcon } from './PlatformIcon';
import { useAuth } from '../lib/auth';

const mainNavigation = [
  { name: 'Overview', href: '/', platform: 'overview' },
  { name: 'DAO Analytics', href: '/daos', platform: 'daos' },
];

const discordNavigation = [
  { name: 'Discord Overview', href: '/discord', platform: 'discord' },
  { name: 'AI Reports', href: '/discord-reports', platform: 'discord' },
];

const platforms = [
  { name: 'Discord', href: '/platform/discord', platform: 'discord' },
  { name: 'Telegram', href: '/platform/telegram', platform: 'telegram' },
  { name: 'Twitter', href: '/platform/twitter', platform: 'twitter' },
  { name: 'YouTube', href: '/platform/youtube', platform: 'youtube' },
  { name: 'LinkedIn', href: '/platform/linkedin', platform: 'linkedin' },
  { name: 'Email', href: '/platform/email_newsletter', platform: 'email_newsletter' },
  { name: 'Luma', href: '/platform/luma', platform: 'luma' },
  { name: 'Website (bio.xyz)', href: '/platform/website_bio', platform: 'website_bio' },
  { name: 'Website (app)', href: '/platform/website_app', platform: 'website_app' },
];

export function Sidebar() {
  const { user } = useAuth();
  const [platformsOpen, setPlatformsOpen] = useState(true);
  const [discordOpen, setDiscordOpen] = useState(true);

  return (
    <aside class="w-72 bg-black border-r border-gray-800">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-10 pb-6 border-b border-gray-800">
          <img
            src="/logo.jpg"
            alt="BioProtocol Logo"
            class="w-12 h-12 rounded-xl object-cover shadow-lg"
          />
          <div>
            <h2 class="font-bold text-white text-lg">BioProtocol</h2>
            <p class="text-xs text-gray-500">Internal Dashboard</p>
          </div>
        </div>

        <nav class="space-y-1.5">
          {/* Main Navigation */}
          {mainNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              activeClassName="bg-gradient-to-r from-blue-600/20 to-blue-600/10 text-white border-l-2 border-blue-500"
              class="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all border-l-2 border-transparent"
            >
              <PlatformIcon platform={item.platform} size="md" />
              <span class="font-medium">{item.name}</span>
            </Link>
          ))}

          {/* Discord Menu Item */}
          <div>
            <button
              onClick={() => setDiscordOpen(!discordOpen)}
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all"
            >
              <div class="flex items-center gap-3">
                <PlatformIcon platform="discord" size="md" />
                <span class="font-medium">Discord</span>
              </div>
              <svg
                class={`w-4 h-4 transition-transform ${discordOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Discord Sub-items */}
            {discordOpen && (
              <div class="mt-1 space-y-1">
                {discordNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    activeClassName="bg-gradient-to-r from-blue-600/20 to-blue-600/10 text-white border-l-2 border-blue-500"
                    class="flex items-center gap-3 pl-14 pr-4 py-2.5 text-sm text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all border-l-2 border-transparent"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.name === 'Discord Overview' ? (
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      ) : (
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      )}
                    </svg>
                    <span class="font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Platforms Menu Item */}
          <div>
            <button
              onClick={() => setPlatformsOpen(!platformsOpen)}
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all"
            >
              <div class="flex items-center gap-3">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span class="font-medium">Platforms</span>
              </div>
              <svg
                class={`w-4 h-4 transition-transform ${platformsOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Platform Sub-items */}
            {platformsOpen && (
              <div class="mt-1 space-y-1">
                {platforms.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    activeClassName="bg-gradient-to-r from-blue-600/20 to-blue-600/10 text-white border-l-2 border-blue-500"
                    class="flex items-center gap-3 pl-14 pr-4 py-2.5 text-sm text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all border-l-2 border-transparent"
                  >
                    <PlatformIcon platform={item.platform} size="sm" />
                    <span class="font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Admin Section - Only visible to admins */}
          {user?.role === 'admin' && (
            <div class="pt-4 mt-4 border-t border-gray-800">
              <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin
              </div>
              <Link
                href="/api-keys"
                activeClassName="bg-gradient-to-r from-blue-600/20 to-blue-600/10 text-white border-l-2 border-blue-500"
                class="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all border-l-2 border-transparent"
              >
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span class="font-medium">API Keys</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}
