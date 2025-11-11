import { Router, Route } from 'preact-router';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Platform } from './pages/Platform';
import { Analytics } from './pages/Analytics';
import { DAOs } from './pages/DAOs';
import { DAODetail } from './pages/DAODetail';

export function App() {
  const PlatformWithKey = ({ platform }: { platform: string }) => {
    // Force remount when platform changes by using platform as key
    return <Platform key={platform} platform={platform} />;
  };

  const DAODetailWithKey = ({ slug }: { slug: string }) => {
    // Force remount when slug changes by using slug as key
    return <DAODetail key={slug} slug={slug} />;
  };

  return (
    <div class="flex h-screen bg-black text-gray-100">
      <Sidebar />
      <div class="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main class="flex-1 overflow-y-auto px-8 py-8 bg-gradient-to-b from-black to-gray-950">
          <div class="max-w-7xl mx-auto">
            <Router>
              <Route path="/" component={Overview} />
              <Route path="/platform/:platform" component={PlatformWithKey} />
              <Route path="/daos" component={DAOs} />
              <Route path="/daos/:slug" component={DAODetailWithKey} />
              <Route path="/analytics" component={Analytics} />
            </Router>
          </div>
        </main>
      </div>
    </div>
  );
}
