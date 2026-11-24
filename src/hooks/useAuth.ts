import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";

/**
 * Custom hook for authentication management
 * Provides authentication status and logout functionality
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
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

  const logout = useCallback(() => {
    try {
      // Remove token from localStorage
      localStorage.removeItem("peparToken");
      
      // Update authentication state
      setIsAuthenticated(false);
      
      // Redirect to signin page
      navigate("/signin", { replace: true });
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [navigate]);

  const login = useCallback((token: string) => {
    try {
      // Store token in localStorage
      localStorage.setItem("peparToken", token);
      
      // Update authentication state
      setIsAuthenticated(true);
      
      // Redirect to dashboard
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error during login:", error);
    }
  }, [navigate]);

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };
};

