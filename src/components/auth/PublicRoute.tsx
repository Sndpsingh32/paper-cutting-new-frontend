import { Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";

/**
 * PublicRoute Component
 * Redirects authenticated users away from public pages (like login)
 * Used to prevent logged-in users from accessing login/signup pages
 */
const PublicRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for authentication token in localStorage
        const token = localStorage.getItem("peparToken");
        
        // Additional validation: check if token is not empty and has reasonable length
        const isValidToken = Boolean(token && token.length > 10);
        
        setIsAuthenticated(isValidToken);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#811f13]"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Render public routes (login/signup) if not authenticated
  return <Outlet />;
};

export default PublicRoute;

