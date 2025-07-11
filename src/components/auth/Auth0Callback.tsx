// src/components/auth/Auth0Callback.tsx
import React, { useEffect } from 'react';
import { toast } from 'sonner';

const Auth0Callback: React.FC = () => {
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        console.error('Auth0 Error:', error, errorDescription);
        toast.error(`Authentication failed: ${errorDescription || error}`);
        // Redirect back to sign in
        window.location.href = '/';
        return;
      }

      if (code) {
        // You would typically exchange the code for tokens here
        // For now, we'll just show success and redirect
        const intent = sessionStorage.getItem('auth0_redirect_intent') || 'signin';
        sessionStorage.removeItem('auth0_redirect_intent');
        
        toast.success(`Google ${intent} successful! Redirecting...`);
        
        // Redirect to main app after a brief delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="absolute -inset-3 bg-black transform rotate-2"></div>
          <div className="relative bg-white border-4 border-black p-8">
            <div className="bg-black text-white p-4 mb-4">
              <h1 className="text-2xl font-black uppercase tracking-wider">
                PROCESSING...
              </h1>
            </div>
            <p className="text-gray-700 font-mono">
              Completing your authentication...
            </p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth0Callback;
