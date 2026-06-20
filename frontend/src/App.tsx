import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Consistency from './pages/Consistency';
import Reconciliation from './pages/Reconciliation';
import Metadata from './pages/Metadata';
import Audits from './pages/Audits';
import Events from './pages/Events';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));

  const handleLoginSuccess = (newToken: string, newUsername: string, newRole: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('role', newRole);
    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  // Keep state sync'd with localStorage updates (e.g. from axios interceptor 401 removals)
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token'));
      setUsername(localStorage.getItem('username'));
      setRole(localStorage.getItem('role'));
    };

    window.addEventListener('storage', handleStorageChange);
    // Periodically poll local storage in case it gets wiped silently by interceptor on same window
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const isAuthenticated = !!token;

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />

          {/* Private Routes with Layout */}
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
                  {/* Sidebar Navigation */}
                  <Sidebar userRole={role || undefined} />

                  {/* Main Work Area */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Navbar */}
                    <Navbar username={username || undefined} onLogout={handleLogout} />

                    {/* Dashboard/Page Viewer */}
                    <main className="flex-1 overflow-y-auto bg-slate-950">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/metadata" element={<Metadata userRole={role || 'Viewer'} />} />
                        <Route path="/consistency" element={<Consistency />} />
                        <Route path="/reconciliation" element={<Reconciliation />} />
                        <Route path="/events" element={<Events />} />
                        <Route path="/audits" element={<Audits />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
