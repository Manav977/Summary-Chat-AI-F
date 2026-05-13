import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppShellLoader } from './components/common/AppShellLoader.jsx';
import { ProtectedRoute } from './components/common/ProtectedRoute.jsx';
import { ToastViewport } from './components/common/ToastViewport.jsx';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'));
const ChatPage = lazy(() => import('./pages/ChatPage.jsx'));

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <AppShellLoader label="Restoring your workspace" />;
  }

  return isAuthenticated ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  return (
    <>
      <Suspense fallback={<AppShellLoader label="Loading the workspace" />}>
        <Routes>
          <Route
            path="/login"
            element={(
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            )}
          />
          <Route
            path="/signup"
            element={(
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            )}
          />
          <Route
            path="/chat"
            element={(
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Suspense>
      <ToastViewport />
    </>
  );
}
