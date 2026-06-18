import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useCurrentUser } from './store/useAuthStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SchemaBrowser from './pages/SchemaBrowser';
import Playground from './pages/Playground';
import RequestLogs from './pages/RequestLogs';
import SavedQueries from './pages/SavedQueries';
import Layout from './components/Layout';
import { useEffect } from 'react';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { user, loading } = useCurrentUser();
  
  useEffect(() => {
    if (user && !useAuthStore.getState().user) {
      useAuthStore.getState().setUser(user);
    }
  }, [user]);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="schema" element={<SchemaBrowser />} />
        <Route path="playground" element={<Playground />} />
        <Route path="logs" element={<RequestLogs />} />
        <Route path="saved" element={<SavedQueries />} />
      </Route>
    </Routes>
  );
}
