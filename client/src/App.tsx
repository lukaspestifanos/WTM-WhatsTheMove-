import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// Lazy load components for better performance
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const CreateEvent = lazy(() => import("@/pages/create-event"));
const EventDetails = lazy(() => import("@/pages/event-details"));
const MyEvents = lazy(() => import("@/pages/my-events"));
const EnhancedFriends = lazy(() => import("@/pages/enhanced-friends"));
const EnhancedProfile = lazy(() => import("@/pages/enhanced-profile"));
const AuthPage = lazy(() => import("@/pages/auth"));
const PaymentPage = lazy(() => import("@/pages/payment-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void; 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="text-center space-y-4 max-w-md">
      <h2 className="text-2xl font-bold text-destructive">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Store the current path for redirect after auth
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth') {
        sessionStorage.setItem('redirectAfterAuth', currentPath);
      }
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

// Public route wrapper (redirects authenticated users away from auth pages)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      // Check for stored redirect path
      const redirectPath = sessionStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterAuth');
        setLocation(redirectPath);
      } else {
        setLocation('/');
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (user && window.location.pathname === '/auth') {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

// Router component
const AppRouter = () => {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth">
        <PublicRoute>
          <AuthPage />
        </PublicRoute>
      </Route>

      <Route path="/landing" component={Landing} />

      {/* Home route - accessible by everyone but different content for auth users */}
      <Route path="/" component={Home} />

      {/* Event details - public but enhanced for authenticated users */}
      <Route path="/events/:id" component={EventDetails} />

      {/* Protected routes */}
      <Route path="/create-event">
        <ProtectedRoute>
          <CreateEvent />
        </ProtectedRoute>
      </Route>

      <Route path="/payment-page">
        <ProtectedRoute>
          <PaymentPage />
        </ProtectedRoute>
      </Route>

      <Route path="/my-events">
        <ProtectedRoute>
          <MyEvents />
        </ProtectedRoute>
      </Route>

      <Route path="/friends">
        <ProtectedRoute>
          <EnhancedFriends />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <EnhancedProfile />
        </ProtectedRoute>
      </Route>

      {/* Public profile view (optional - for sharing profiles) */}
      <Route path="/profile/:userId" component={EnhancedProfile} />

      {/* 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
};

// Service worker registration
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Main App component
function App() {
  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
      onError={(error, errorInfo) => {
        // Log error to monitoring service
        console.error('App Error:', error, errorInfo);
        // You can integrate with error tracking services like Sentry here
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              {/* Global navigation */}
              <HamburgerMenu />

              {/* Main content with loading boundaries */}
              <Suspense fallback={<PageLoader />}>
                <main className="relative">
                  <AppRouter />
                </main>
              </Suspense>

              {/* Global toast notifications */}
              <Toaster />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;