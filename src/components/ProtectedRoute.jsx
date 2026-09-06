import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCw } from 'lucide-react';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const ServerErrorScreen = ({ message, onRetry }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="max-w-md text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-amber-600" />
      </div>
      <h2 className="text-xl font-heading font-semibold">Connection issue</h2>
      <p className="text-muted-foreground text-sm">{message || "We couldn't reach the server. This is usually temporary."}</p>
      <Button onClick={onRetry} className="h-11">
        <RotateCw className="w-4 h-4 mr-2" />
        Try again
      </Button>
    </div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, retryAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'server_error') {
      return <ServerErrorScreen message={authError.message} onRetry={retryAuth} />;
    }
    // auth_required or any other auth error → redirect to login
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}