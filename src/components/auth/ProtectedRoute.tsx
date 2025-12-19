import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, shouldRedirectToSetup, isApproved, markSetupRedirectDone } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect unapproved users to pending approval page
  useEffect(() => {
    if (!isLoading && user && !isApproved && location.pathname !== '/pending-approval') {
      console.log('[ProtectedRoute] Redirecting unapproved user to pending approval...');
      navigate('/pending-approval', { replace: true });
    }
  }, [user, isLoading, isApproved, location.pathname, navigate]);

  // Redirect admin to setup on first login (only once per session)
  useEffect(() => {
    if (!isLoading && user && shouldRedirectToSetup && location.pathname !== '/whatsapp/settings') {
      console.log('[ProtectedRoute] Redirecting admin to setup...');
      markSetupRedirectDone();
      navigate('/whatsapp/settings?tab=setup', { replace: true });
    }
  }, [user, isLoading, shouldRedirectToSetup, location.pathname, navigate, markSetupRedirectDone]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
