import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const AuthCallback: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        console.error('Auth error:', error, errorDescription);
        // Redirect to login with error
        window.location.href = '/login?error=' + encodeURIComponent(errorDescription || error);
        return;
      }

      // If user is authenticated, redirect to dashboard
      if (user) {
        window.location.href = '/';
      }
    };

    handleAuthCallback();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Finalizando login...</h2>
        <p className="text-gray-600">Aguarde enquanto processamos sua autenticação.</p>
      </div>
    </div>
  );
};