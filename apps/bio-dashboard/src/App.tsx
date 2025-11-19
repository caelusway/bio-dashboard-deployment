import { Router, Route } from 'preact-router';
import { AuthProvider, useAuth } from './lib/auth';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Platform } from './pages/Platform';
import { Analytics } from './pages/Analytics';
import { DAOs } from './pages/DAOs';
import { DAODetail } from './pages/DAODetail';
import { Login } from './pages/Login';

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  const PlatformWithKey = ({ platform }: { platform: string }) => {
    return <Platform key={platform} platform={platform} />;
  };

  const DAODetailWithKey = ({ slug }: { slug: string }) => {
    return <DAODetail key={slug} slug={slug} />;
  };

  // Show loading state
  if (loading) {
    return (
      <div class="flex h-screen bg-black items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes (login only)
  if (!user) {
    return (
      <Router>
        <Route path="/login" component={Login} />
        <Route default component={Login} />
      </Router>
    );
  }

  // Protected dashboard routes
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

export function App() {
  return (
    <AuthProvider>
      <ProtectedRoutes />
    </AuthProvider>
  );
}
