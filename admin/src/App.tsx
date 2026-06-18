import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  const { isAuthenticated, loading: authLoading, checkAuth } = useAuthStore();
  const { user, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (localStorage.getItem('token') && !isAuthenticated) {
      checkAuth();
    }
  }, [checkAuth, isAuthenticated]);
  
  useEffect(() => {
    if (user && !useAuthStore.getState().user) {
      useAuthStore.getState().setUser(user);
    }
  }, [user]);
  
  const loading = authLoading || userLoading;
  
  if (!localStorage.getItem('token') && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
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
